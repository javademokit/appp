import { useCallback, useEffect, useState } from 'react';
import { Ambulance, AlertTriangle, ArrowRightLeft, Plus, RefreshCw, ShieldAlert } from 'lucide-react';
import { apiFetch } from '../API/api';
import './Operations.css';

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const severityLabels = ['CRITICAL', 'HIGH', 'MODERATE', 'LOW'];
const statusLabels = ['WAITING_FOR_TRIAGE', 'TRIAGED', 'IN_CARE', 'TRANSFERRED', 'CLOSED'];
const pretty = (value) => String(value || '').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());

export default function EmergencyTriagePage() {
  const [cases, setCases] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ patientId: '', complaint: '', severity: 'MODERATE', ambulanceRequired: false, assignedClinician: '' });

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [caseResponse, patientResponse] = await Promise.all([
        apiFetch('/emergency/cases'),
        apiFetch('/patients'),
      ]);
      const [caseData, patientData] = await Promise.all([readResponse(caseResponse), readResponse(patientResponse)]);
      setCases(caseData);
      setPatients(patientData.filter((patient) => patient.patientId));
    }
    catch (requestError) { setError(requestError.message || 'Could not load emergency queue'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const createCase = async (event) => {
    event.preventDefault(); setBusyId('new'); setError(''); setSuccess('');
    try {
      await readResponse(await apiFetch('/emergency/cases', { method: 'POST', body: JSON.stringify(form) }));
      setForm({ patientId: '', complaint: '', severity: 'MODERATE', ambulanceRequired: false, assignedClinician: '' });
      setShowForm(false); setSuccess('Emergency case added to the triage queue.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusyId(''); }
  };

  const updateCase = async (id, updates) => {
    setError(''); setSuccess(''); setBusyId(id);
    try {
      await readResponse(await apiFetch(`/emergency/cases/${id}`, { method: 'PATCH', body: JSON.stringify(updates) }));
      setSuccess('Emergency case updated.'); await refresh();
    } catch (requestError) { setError(requestError.message); await refresh(); }
    finally { setBusyId(''); }
  };

  const criticalCases = cases.filter((item) => item.criticalAlert && item.status !== 'CLOSED');
  const activeCases = cases.filter((item) => item.status !== 'CLOSED');
  const ambulanceCases = cases.filter((item) => item.ambulanceRequired && !['ARRIVED', 'NOT_REQUIRED'].includes(item.ambulanceStatus));
  const transferCases = cases.filter((item) => item.transferStatus && !['NOT_REQUIRED', 'COMPLETED'].includes(item.transferStatus));

  return (
    <section className="workflow-page" aria-labelledby="emergency-title">
      <header className="workflow-header">
        <div><p className="workflow-eyebrow">Emergency operations</p><h1 id="emergency-title">Triage &amp; emergency</h1><p>Prioritize arrivals, coordinate response, and track transfers.</p></div>
        <button className="workflow-button primary" type="button" onClick={() => { setError(''); setShowForm((shown) => !shown); }}><Plus size={16} /> Register arrival</button>
      </header>

      {criticalCases.length > 0 && <div className="critical-alert" role="alert"><ShieldAlert size={19} /><div><strong>{criticalCases.length} critical {criticalCases.length === 1 ? 'case' : 'cases'} require immediate attention</strong><span>Critical severity is raised automatically when a case is registered or updated.</span></div></div>}
      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}

      <div className="workflow-kpis">
        <article className={criticalCases.length ? 'critical-kpi' : ''}><span>Critical alerts</span><strong>{criticalCases.length}</strong><AlertTriangle size={18} /></article>
        <article><span>Active queue</span><strong>{activeCases.length}</strong><ShieldAlert size={18} /></article>
        <article className={ambulanceCases.length ? 'attention' : ''}><span>Ambulance coordination</span><strong>{ambulanceCases.length}</strong><Ambulance size={18} /></article>
        <article><span>Transfers in progress</span><strong>{transferCases.length}</strong><ArrowRightLeft size={18} /></article>
      </div>

      {showForm && <form className="workflow-form-panel" onSubmit={createCase}>
        <div className="workflow-panel-heading"><div><h2>Register emergency arrival</h2><p>Critical cases will be highlighted immediately in the queue.</p></div><button className="workflow-button subtle" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        <div className="workflow-form-grid">
          <label>Patient<select required value={form.patientId} onChange={(e) => setForm({ ...form, patientId: e.target.value })}><option value="">Select patient</option>{patients.map((patient) => <option key={patient.patientId} value={patient.patientId}>{patient.patientName} · {patient.patientId}</option>)}</select></label>
          <label>Severity<select value={form.severity} onChange={(e) => setForm({ ...form, severity: e.target.value })}>{severityLabels.map((severity) => <option key={severity} value={severity}>{pretty(severity)}</option>)}</select></label>
          <label>Assigned clinician<input value={form.assignedClinician} onChange={(e) => setForm({ ...form, assignedClinician: e.target.value })} /></label>
          <label className="workflow-form-wide">Presenting complaint<textarea required rows="2" value={form.complaint} onChange={(e) => setForm({ ...form, complaint: e.target.value })} /></label>
          <label className="workflow-checkbox"><input type="checkbox" checked={form.ambulanceRequired} onChange={(e) => setForm({ ...form, ambulanceRequired: e.target.checked })} /> Ambulance coordination required</label>
        </div>
        <div className="workflow-form-actions"><button className="workflow-button primary" disabled={busyId === 'new'} type="submit">Add to triage queue</button></div>
      </form>}

      <section className="workflow-panel emergency-queue-panel">
        <div className="workflow-panel-heading"><div><h2>Emergency queue</h2><p>Sort by severity and update patient, ambulance, and transfer state.</p></div><button className="workflow-button subtle" type="button" onClick={refresh}><RefreshCw size={15} /> Refresh</button></div>
        {loading ? <div className="workflow-empty">Loading emergency queue…</div> : !cases.length ? <div className="workflow-empty">No emergency arrivals registered.</div> : <div className="emergency-case-list">{[...cases].sort((a, b) => severityLabels.indexOf(a.severity) - severityLabels.indexOf(b.severity)).map((item) => <article className={`emergency-case ${item.criticalAlert && item.status !== 'CLOSED' ? 'is-critical' : ''}`} key={item.id}>
          <div className="emergency-case-main"><div className="emergency-case-title"><span className={`severity-badge severity-${String(item.severity).toLowerCase()}`}>{pretty(item.severity)}</span><strong>{item.patientName}</strong><span className="emergency-case-id">{item.patientId || `#${item.id?.slice(-6)}`}</span></div><p>{item.complaint}</p><div className="emergency-case-meta"><span>Arrived {item.createdAt ? new Date(item.createdAt).toLocaleString() : '—'}</span>{item.assignedClinician && <span>Clinician: {item.assignedClinician}</span>}</div></div>
          <div className="emergency-case-controls"><label>Queue status<select value={item.status} disabled={busyId === item.id} onChange={(e) => updateCase(item.id, { status: e.target.value })}>{statusLabels.map((status) => <option key={status} value={status}>{pretty(status)}</option>)}</select></label><label>Ambulance<select value={item.ambulanceStatus || 'NOT_REQUIRED'} disabled={busyId === item.id} onChange={(e) => updateCase(item.id, { ambulanceRequired: e.target.value !== 'NOT_REQUIRED', ambulanceStatus: e.target.value })}><option value="NOT_REQUIRED">Not required</option><option value="REQUESTED">Requested</option><option value="DISPATCHED">Dispatched</option><option value="EN_ROUTE">En route</option><option value="ARRIVED">Arrived</option></select></label><label>Transfer<select value={item.transferStatus || 'NOT_REQUIRED'} disabled={busyId === item.id} onChange={(e) => updateCase(item.id, { transferStatus: e.target.value, status: e.target.value === 'IN_TRANSIT' ? 'TRANSFERRED' : item.status })}><option value="NOT_REQUIRED">Not required</option><option value="REQUESTED">Requested</option><option value="IN_TRANSIT">In transit</option><option value="COMPLETED">Completed</option></select></label></div>
        </article>)}</div>}
      </section>
    </section>
  );
}
