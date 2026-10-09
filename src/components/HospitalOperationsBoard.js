import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity as ActivityIcon,
  BedDouble,
  CalendarDays,
  ClipboardCheck,
  HeartPulse,
  RefreshCw,
  Siren,
  UsersRound,
} from 'lucide-react';
import { apiFetch } from '../API/api';
import '../LandiningPage/App.css';
import '../Operations/Operations.css';
import './HospitalOperationsBoard.css';

const ranges = [
  { id: 'today', label: 'Today' },
  { id: 'week', label: '7 days' },
  { id: 'month', label: '30 days' },
];
const mixColors = ['#087f8c', '#e17b43', '#6a9b6e', '#bb5872'];

function WardBedTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const ward = payload[0].payload;
  return (
    <div className="ward-chart-tooltip">
      <strong>{label}</strong>
      <span><i className="ward-bed-dot available" />Available <b>{ward.availableBeds}</b></span>
      <span><i className="ward-bed-dot occupied" />Occupied <b>{ward.occupiedBeds}</b></span>
      <span><i className="ward-bed-dot unavailable" />Unavailable <b>{ward.unavailableBeds}</b></span>
      <span className="ward-tooltip-total">Total beds <b>{ward.totalBeds}</b></span>
      <span>Admissions <b>{ward.patients}</b></span>
    </div>
  );
}

async function readSummary() {
  const path = '/dashboard/summary';
  const response = await apiFetch(path);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Could not load ${path}`);
  if (!data || !Array.isArray(data.dailyActivity) || !Array.isArray(data.hourlyActivity)
      || !Array.isArray(data.wardData)) {
    throw new Error(`${path} returned an invalid response`);
  }
  return data;
}

function localDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateKey(value) {
  if (!value) return '';
  const text = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '' : localDateKey(parsed);
}

function buildTimeline(range, summary) {
  if (range === 'today') {
    return summary.hourlyActivity.map((point) => ({
      ...point,
      label: point.hour % 3 === 0 ? point.label : '',
    }));
  }
  return summary.dailyActivity
    .filter((point) => isInRange(point.key, range))
    .map((point) => {
      const date = new Date(`${point.key}T12:00:00`);
      return {
        ...point,
        label: range === 'week'
          ? date.toLocaleDateString(undefined, { weekday: 'short' })
          : date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' }),
      };
    });
}

function isInRange(value, range) {
  const key = dateKey(value);
  if (!key) return false;
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (range === 'week') start.setDate(start.getDate() - 6);
  if (range === 'month') start.setDate(start.getDate() - 29);
  return key >= localDateKey(start) && key <= localDateKey(now);
}

export default function HospitalOperationsBoard() {
  const [range, setRange] = useState('today');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setData(await readSummary());
      setLastUpdated(new Date());
    } catch (requestError) {
      setError(requestError.message || 'Could not load live hospital data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(interval);
  }, [refresh]);

  const timeline = useMemo(() => data ? buildTimeline(range, data) : [], [data, range]);
  const wardChartData = useMemo(() => (data?.wardData || []).map((ward) => ({
    ...ward,
    totalBeds: Number(ward.totalBeds) || 0,
    availableBeds: Number(ward.availableBeds) || 0,
    occupiedBeds: Number(ward.occupiedBeds) || 0,
    patients: Number(ward.patients) || 0,
    unavailableBeds: Math.max(
      0,
      (Number(ward.totalBeds) || 0) - (Number(ward.availableBeds) || 0) - (Number(ward.occupiedBeds) || 0),
    ),
  })), [data]);
  const metrics = useMemo(() => {
    if (!data) return null;
    const periodPoints = data.dailyActivity.filter((point) => isInRange(point.key, range));
    const totals = periodPoints.reduce((result, point) => ({
      visits: result.visits + point.visits,
      emergency: result.emergency + point.emergency,
      diagnostics: result.diagnostics + point.diagnostics,
      admissions: result.admissions + point.admissions,
    }), { visits: 0, emergency: 0, diagnostics: 0, admissions: 0 });
    const serviceValues = [
      { name: 'Appointments', value: totals.visits },
      { name: 'Emergency', value: totals.emergency },
      { name: 'Diagnostics', value: totals.diagnostics },
      { name: 'Admissions', value: totals.admissions },
    ].filter((item) => item.value > 0);
    const totalServiceEvents = serviceValues.reduce((sum, item) => sum + item.value, 0);
    return {
      rangeAppointments: totals.visits,
      wardData: wardChartData,
      totalBeds: data.totalBeds || 0,
      availableBeds: data.availableBeds || 0,
      occupiedBeds: data.occupiedBeds || 0,
      totalNurses: data.totalNurses || 0,
      openEmergencies: data.openEmergencies,
      awaitingReview: data.resultsAwaitingReview,
      testsOrdered: data.testsOrdered,
      testsInProgress: data.testsInProgress,
      serviceMix: serviceValues.map((item, index) => ({
        ...item,
        color: mixColors[index],
        share: totalServiceEvents ? Math.round((item.value / totalServiceEvents) * 100) : 0,
      })),
    };
  }, [data, range, wardChartData]);

  return (
    <section className="hospital-live-panel ops-board" aria-labelledby="operations-board-title" aria-busy={loading}>
      <div className="ops-board-header">
        <div>
          <div className="ops-eyebrow"><ActivityIcon size={15} /> Hospital operations</div>
          <h2 id="operations-board-title">Operations dashboard</h2>
          <p className="ops-subtitle">Live counts from appointments, patient records, diagnostics, and emergency cases.</p>
        </div>
        <div className="ops-header-controls">
          <span className={`demo-badge ${error ? 'live-badge-error' : 'live-badge'}`}>{error ? 'Feed unavailable' : 'Live API data'}</span>
          <div className="range-control" role="group" aria-label="Chart date range">
            {ranges.map((option) => (
              <button key={option.id} type="button" className={range === option.id ? 'range-button active' : 'range-button'}
                aria-pressed={range === option.id} onClick={() => setRange(option.id)}>
                {option.label}
              </button>
            ))}
          </div>
          <button className="range-button" type="button" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} /> {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>
      </div>

      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {!data ? <div className="ops-data-state">{loading ? 'Loading live hospital data…' : 'Dashboard data is unavailable. Refresh after the API is reachable.'}</div> : <>
        <div className="ops-kpi-grid">
          <article className="ops-kpi ops-kpi-appointments">
            <span className="ops-kpi-icon"><CalendarDays size={18} /></span>
            <span className="ops-kpi-label">Appointments · {ranges.find((item) => item.id === range).label}</span>
            <strong>{metrics.rangeAppointments.toLocaleString()}</strong>
            <span className="ops-kpi-note">Non-cancelled bookings</span>
          </article>
          <article className="ops-kpi ops-kpi-admissions">
            <span className="ops-kpi-icon"><HeartPulse size={18} /></span>
            <span className="ops-kpi-label">Current admissions</span>
            <strong>{data.activeAdmissions.toLocaleString()}</strong>
            <span className="ops-kpi-note">Patients not yet discharged</span>
          </article>
          <article className="ops-kpi ops-kpi-emergency">
            <span className="ops-kpi-icon"><Siren size={18} /></span>
            <span className="ops-kpi-label">Open emergency cases</span>
            <strong>{metrics.openEmergencies.toLocaleString()}</strong>
            <span className="ops-kpi-note">Cases not closed</span>
          </article>
          <article className="ops-kpi ops-kpi-review">
            <span className="ops-kpi-icon"><ClipboardCheck size={18} /></span>
            <span className="ops-kpi-label">Results awaiting review</span>
            <strong>{metrics.awaitingReview.toLocaleString()}</strong>
            <span className="ops-kpi-note">Diagnostic results requiring clinician review</span>
          </article>
          <article className="ops-kpi ops-kpi-beds">
            <span className="ops-kpi-icon"><BedDouble size={18} /></span>
            <span className="ops-kpi-label">Total beds</span>
            <strong>{metrics.totalBeds.toLocaleString()}</strong>
            <span className="ops-kpi-note">Registered across all wards</span>
          </article>
          <article className="ops-kpi ops-kpi-available">
            <span className="ops-kpi-icon"><BedDouble size={18} /></span>
            <span className="ops-kpi-label">Available beds</span>
            <strong>{metrics.availableBeds.toLocaleString()}</strong>
            <span className="ops-kpi-note">Currently marked vacant</span>
          </article>
          <article className="ops-kpi ops-kpi-occupied">
            <span className="ops-kpi-icon"><BedDouble size={18} /></span>
            <span className="ops-kpi-label">Occupied beds</span>
            <strong>{metrics.occupiedBeds.toLocaleString()}</strong>
            <span className="ops-kpi-note">Currently marked occupied</span>
          </article>
          <article className="ops-kpi ops-kpi-nurses">
            <span className="ops-kpi-icon"><UsersRound size={18} /></span>
            <span className="ops-kpi-label">Active nurses</span>
            <strong>{metrics.totalNurses.toLocaleString()}</strong>
            <span className="ops-kpi-note">Active nurse employees</span>
          </article>
        </div>

        <div className="ops-chart-grid">
          <article className="ops-chart-card visits-chart-card">
            <div className="ops-chart-heading"><div><h3>Patient activity</h3><p>Recorded appointments and emergency arrivals</p></div><span className="chart-unit">records</span></div>
            <div className="ops-chart-area">
              {timeline.some((point) => point.visits || point.emergency) ? <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeline} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="visitFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#087f8c" stopOpacity={0.24} /><stop offset="100%" stopColor="#087f8c" stopOpacity={0.01} /></linearGradient>
                    <linearGradient id="emergencyFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e17b43" stopOpacity={0.2} /><stop offset="100%" stopColor="#e17b43" stopOpacity={0.01} /></linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e5ecea" strokeDasharray="3 5" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#6d7d7a', fontSize: 11 }} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#6d7d7a', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: '#dce5e2', fontSize: 12 }} />
                  <Area type="monotone" dataKey="visits" name="Appointments" stroke="#087f8c" strokeWidth={2.5} fill="url(#visitFill)" />
                  <Area type="monotone" dataKey="emergency" name="Emergency" stroke="#e17b43" strokeWidth={2} fill="url(#emergencyFill)" />
                </AreaChart>
              </ResponsiveContainer> : <div className="ops-data-state">No activity recorded in this date range.</div>}
            </div>
            <div className="chart-legend"><span><i className="legend-dot visits" /> Appointments</span><span><i className="legend-dot emergency" /> Emergency</span></div>
          </article>

          <article className="ops-chart-card occupancy-chart-card">
            <div className="ops-chart-heading">
              <div><h3>Beds by ward</h3><p>Compare availability and occupancy across each ward</p></div>
              <span className="chart-unit">{metrics.wardData.length} {metrics.wardData.length === 1 ? 'ward' : 'wards'}</span>
            </div>
            <div className="ward-bed-legend" aria-label="Bed status chart legend">
              <span><i className="ward-bed-dot available" />Available</span>
              <span><i className="ward-bed-dot occupied" />Occupied</span>
              <span><i className="ward-bed-dot unavailable" />Unavailable</span>
            </div>
            {metrics.wardData.length ? (
              <div className="ward-chart-scroll" role="group"
                aria-label={`Stacked horizontal bar chart showing available, occupied, and unavailable beds across ${metrics.wardData.length} ${metrics.wardData.length === 1 ? 'ward' : 'wards'}`}>
                <div className="ward-chart-canvas" style={{ height: `${Math.max(260, metrics.wardData.length * 42)}px` }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.wardData} layout="vertical" margin={{ top: 4, right: 20, left: 4, bottom: 4 }} barCategoryGap="28%">
                      <CartesianGrid horizontal={false} stroke="#edf2ef" />
                      <XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false}
                        tick={{ fill: '#82918c', fontSize: 11 }} />
                      <YAxis dataKey="unit" type="category" width={112} tickLine={false} axisLine={false}
                        tick={{ fill: '#50645e', fontSize: 11 }} />
                      <Tooltip content={<WardBedTooltip />} cursor={{ fill: '#f3f8f5' }} />
                      <Bar dataKey="availableBeds" name="Available" stackId="beds" fill="#35a77c" />
                      <Bar dataKey="occupiedBeds" name="Occupied" stackId="beds" fill="#e29a4a" />
                      <Bar dataKey="unavailableBeds" name="Unavailable" stackId="beds" fill="#aab8b2" radius={[0, 5, 5, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            ) : <div className="ops-data-state">No ward or bed inventory has been recorded.</div>}
          </article>

          <article className="ops-chart-card mix-chart-card">
            <div className="ops-chart-heading"><div><h3>Recorded service activity</h3><p>Share of records in selected period</p></div><span className="chart-unit">share</span></div>
            <div className="mix-chart-layout">
              <div className="mix-chart-wrap">
                {metrics.serviceMix.length ? <ResponsiveContainer width="100%" height="100%">
                  <PieChart><Pie data={metrics.serviceMix} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={3} stroke="none">
                    {metrics.serviceMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie><Tooltip contentStyle={{ borderRadius: 8, borderColor: '#dce5e2', fontSize: 12 }} /></PieChart>
                </ResponsiveContainer> : <div className="ops-data-state">No service activity recorded.</div>}
              </div>
              <ul className="mix-legend">{metrics.serviceMix.map((item) => (
                <li key={item.name}><span><i style={{ backgroundColor: item.color }} />{item.name}</span><strong>{item.share}%</strong></li>
              ))}</ul>
            </div>
          </article>

          <article className="ops-chart-card service-status-card">
            <div className="ops-chart-heading"><div><h3>Live work queues</h3><p>Open work derived from current records</p></div><span className="chart-unit">now</span></div>
            <ul className="service-status-list">
              <li><span><i className="status-indicator busy" />Emergency cases open</span><strong>{metrics.openEmergencies}</strong></li>
              <li><span><i className="status-indicator busy" />Tests awaiting sample</span><strong>{metrics.testsOrdered}</strong></li>
              <li><span><i className="status-indicator busy" />Tests in progress</span><strong>{metrics.testsInProgress}</strong></li>
              <li><span><i className="status-indicator busy" />Results awaiting review</span><strong>{metrics.awaitingReview}</strong></li>
            </ul>
            <div className="board-updated"><span className="live-dot" />{lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString()}` : 'Waiting for first update'}</div>
          </article>
        </div>
      </>}
    </section>
  );
}
