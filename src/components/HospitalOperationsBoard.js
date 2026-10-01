import { useEffect, useState } from "react";
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
} from "recharts";
import "../LandiningPage/App.css";

const chartDataByRange = {
  today: [
    { label: "00:00", visits: 12, emergency: 3 },
    { label: "04:00", visits: 8, emergency: 2 },
    { label: "08:00", visits: 27, emergency: 6 },
    { label: "12:00", visits: 39, emergency: 9 },
    { label: "16:00", visits: 34, emergency: 7 },
    { label: "20:00", visits: 26, emergency: 5 },
  ],
  week: [
    { label: "Mon", visits: 112, emergency: 22 },
    { label: "Tue", visits: 126, emergency: 19 },
    { label: "Wed", visits: 119, emergency: 24 },
    { label: "Thu", visits: 138, emergency: 27 },
    { label: "Fri", visits: 151, emergency: 31 },
    { label: "Sat", visits: 144, emergency: 28 },
    { label: "Sun", visits: 128, emergency: 23 },
  ],
  month: [
    { label: "1–5", visits: 520, emergency: 96 },
    { label: "6–10", visits: 568, emergency: 111 },
    { label: "11–15", visits: 541, emergency: 104 },
    { label: "16–20", visits: 612, emergency: 127 },
    { label: "21–25", visits: 644, emergency: 139 },
    { label: "26–30", visits: 601, emergency: 118 },
  ],
};

const initialCapacityData = [
  { unit: "Emergency", occupied: 72, available: 28 },
  { unit: "ICU", occupied: 81, available: 19 },
  { unit: "General", occupied: 64, available: 36 },
  { unit: "Maternity", occupied: 48, available: 52 },
  { unit: "Pediatrics", occupied: 57, available: 43 },
];

const serviceMix = [
  { name: "Outpatient", value: 44, color: "#087f8c" },
  { name: "Emergency", value: 21, color: "#e17b43" },
  { name: "Diagnostics", value: 20, color: "#6a9b6e" },
  { name: "Inpatient", value: 15, color: "#bb5872" },
];

const ranges = [
  { id: "today", label: "Today" },
  { id: "week", label: "7 days" },
  { id: "month", label: "30 days" },
];

export default function HospitalOperationsBoard() {
  const [range, setRange] = useState("today");
  const [chartData, setChartData] = useState(chartDataByRange.today);
  const [capacityData, setCapacityData] = useState(initialCapacityData);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  useEffect(() => {
    setChartData(chartDataByRange[range]);
    const interval = setInterval(() => {
      setChartData((current) => current.map((item) => ({
        ...item,
        visits: Math.max(1, item.visits + Math.round(Math.random() * 4 - 2)),
        emergency: Math.max(0, item.emergency + Math.round(Math.random() * 2 - 1)),
      })));
      setCapacityData((current) => current.map((item) => {
        const occupied = Math.max(35, Math.min(94, item.occupied + Math.round(Math.random() * 4 - 2)));
        return { ...item, occupied, available: 100 - occupied };
      }));
      setLastUpdated(Date.now());
    }, 10000);

    return () => clearInterval(interval);
  }, [range]);

  const visitTotal = chartData.reduce((total, item) => total + item.visits, 0);
  const averageOccupancy = Math.round(
    capacityData.reduce((total, item) => total + item.occupied, 0) / capacityData.length
  );
  const minutesSinceUpdate = Math.floor((Date.now() - lastUpdated) / 60000);

  return (
    <section className="hospital-live-panel ops-board" aria-labelledby="operations-board-title">
      <div className="ops-board-header">
        <div>
          <div className="ops-eyebrow"><span className="live-dot" /> Hospital operations</div>
          <h2 id="operations-board-title">Operations board</h2>
          <p className="ops-subtitle">A live-refreshing sample view of hospital activity. No patient records are shown.</p>
        </div>
        <div className="ops-header-controls">
          <span className="demo-badge">Demo data</span>
          <div className="range-control" role="group" aria-label="Chart date range">
            {ranges.map((option) => (
              <button
                key={option.id}
                type="button"
                className={range === option.id ? "range-button active" : "range-button"}
                aria-pressed={range === option.id}
                onClick={() => setRange(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="ops-kpi-grid">
        <article className="ops-kpi">
          <span className="ops-kpi-label">Visits · {ranges.find((item) => item.id === range).label}</span>
          <strong>{visitTotal.toLocaleString()}</strong>
          <span className="ops-kpi-note">Across outpatient and emergency</span>
        </article>
        <article className="ops-kpi">
          <span className="ops-kpi-label">Average bed occupancy</span>
          <strong>{averageOccupancy}<small>%</small></strong>
          <span className="ops-kpi-note">Across 5 care units</span>
        </article>
        <article className="ops-kpi">
          <span className="ops-kpi-label">Emergency response</span>
          <strong>08<small> min</small></strong>
          <span className="ops-kpi-note"><span className="status-mark good" /> Within target</span>
        </article>
        <article className="ops-kpi">
          <span className="ops-kpi-label">Clinical team</span>
          <strong>42</strong>
          <span className="ops-kpi-note"><span className="status-mark good" /> On duty</span>
        </article>
      </div>

      <div className="ops-chart-grid">
        <article className="ops-chart-card visits-chart-card">
          <div className="ops-chart-heading">
            <div><h3>Patient activity</h3><p>Visits and emergency arrivals</p></div>
            <span className="chart-unit">cases</span>
          </div>
          <div className="ops-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="visitFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#087f8c" stopOpacity={0.24} />
                    <stop offset="100%" stopColor="#087f8c" stopOpacity={0.01} />
                  </linearGradient>
                  <linearGradient id="emergencyFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#e17b43" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#e17b43" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="#e5ecea" strokeDasharray="3 5" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#6d7d7a", fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#6d7d7a", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#dce5e2", fontSize: 12 }} />
                <Area type="monotone" dataKey="visits" name="Visits" stroke="#087f8c" strokeWidth={2.5} fill="url(#visitFill)" />
                <Area type="monotone" dataKey="emergency" name="Emergency" stroke="#e17b43" strokeWidth={2} fill="url(#emergencyFill)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend"><span><i className="legend-dot visits" /> Visits</span><span><i className="legend-dot emergency" /> Emergency</span></div>
        </article>

        <article className="ops-chart-card occupancy-chart-card">
          <div className="ops-chart-heading">
            <div><h3>Unit occupancy</h3><p>Capacity utilization by unit</p></div>
            <span className="chart-unit">%</span>
          </div>
          <div className="ops-chart-area">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capacityData} layout="vertical" margin={{ top: 2, right: 12, left: 12, bottom: 0 }}>
                <CartesianGrid horizontal={false} stroke="#e5ecea" />
                <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: "#6d7d7a", fontSize: 11 }} />
                <YAxis dataKey="unit" type="category" width={76} tickLine={false} axisLine={false} tick={{ fill: "#435451", fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#dce5e2", fontSize: 12 }} />
                <Bar dataKey="occupied" name="Occupied" stackId="capacity" fill="#087f8c" radius={[0, 4, 4, 0]} />
                <Bar dataKey="available" name="Available" stackId="capacity" fill="#e8efec" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-legend"><span><i className="legend-dot visits" /> Occupied</span><span><i className="legend-dot available" /> Available</span></div>
        </article>

        <article className="ops-chart-card mix-chart-card">
          <div className="ops-chart-heading">
            <div><h3>Service mix</h3><p>Share of recorded activity</p></div>
            <span className="chart-unit">share</span>
          </div>
          <div className="mix-chart-layout">
            <div className="mix-chart-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={serviceMix} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="88%" paddingAngle={3} stroke="none">
                    {serviceMix.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, borderColor: "#dce5e2", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mix-legend">
              {serviceMix.map((item) => (
                <li key={item.name}><span><i style={{ backgroundColor: item.color }} />{item.name}</span><strong>{item.value}%</strong></li>
              ))}
            </ul>
          </div>
        </article>

        <article className="ops-chart-card service-status-card">
          <div className="ops-chart-heading">
            <div><h3>Service status</h3><p>Operational readiness</p></div>
            <span className="chart-unit">now</span>
          </div>
          <ul className="service-status-list">
            <li><span><i className="status-indicator ready" />Emergency & trauma</span><strong>Ready</strong></li>
            <li><span><i className="status-indicator ready" />Diagnostic laboratory</span><strong>Ready</strong></li>
            <li><span><i className="status-indicator busy" />Critical care beds</span><strong>Busy</strong></li>
            <li><span><i className="status-indicator ready" />Ambulance dispatch</span><strong>Ready</strong></li>
          </ul>
          <div className="board-updated"><span className="live-dot" />Sample feed refreshed {minutesSinceUpdate ? `${minutesSinceUpdate}m ago` : "just now"}</div>
        </article>
      </div>
    </section>
  );
}
