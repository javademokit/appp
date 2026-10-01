import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock3, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { apiFetch } from '../API/api';
import './Operations.css';

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const today = new Date().toISOString().slice(0, 10);
const initialForm = { staffId: '', staffName: '', staffRole: 'Doctor', department: '', shiftDate: today, startTime: '08:00', endTime: '16:00', notes: '' };

export default function StaffShiftsPage() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dateFilter, setDateFilter] = useState(today);
  const [form, setForm] = useState(initialForm);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setShifts(await readResponse(await apiFetch('/staff/shifts'))); }
    catch (requestError) { setError(requestError.message || 'Could not load staff shifts'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const saveShift = async (event) => {
    event.preventDefault(); setError(''); setSuccess(''); setBusy(true);
    try {
      await readResponse(await apiFetch('/staff/shifts', { method: 'POST', body: JSON.stringify(form) }));
      setForm(initialForm); setShowForm(false); setSuccess('Staff shift scheduled.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const updateStatus = async (shift, status) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await readResponse(await apiFetch(`/staff/shifts/${shift.id}`, {
        method: 'PUT', body: JSON.stringify({ ...shift, status }),
      }));
      setSuccess('Shift status updated.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const deleteShift = async (id) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      await readResponse(await apiFetch(`/staff/shifts/${id}`, { method: 'DELETE' }));
      setSuccess('Shift removed.'); await refresh();
    } catch (requestError) { setError(requestError.message); }
    finally { setBusy(false); }
  };

  const filteredShifts = shifts.filter((shift) => !dateFilter || shift.shiftDate === dateFilter);
  const todayCoverage = shifts.filter((shift) => shift.shiftDate === today && shift.status !== 'CANCELLED').length;
  const departmentsToday = new Set(shifts.filter((shift) => shift.shiftDate === today).map((shift) => shift.department)).size;
  const roleCounts = ['Doctor', 'Nurse', 'Technician'].map((role) => ({ role, count: filteredShifts.filter((shift) => shift.staffRole === role).length }));

  return (
    <section className="workflow-page" aria-labelledby="staff-shifts-title">
      <header className="workflow-header">
        <div><p className="workflow-eyebrow">People operations</p><h1 id="staff-shifts-title">Staff &amp; shift management</h1><p>Plan clinician coverage and coordinate department handovers.</p></div>
        <button className="workflow-button primary" type="button" onClick={() => { setError(''); setShowForm((shown) => !shown); }}><Plus size={16} /> Schedule shift</button>
      </header>

      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}

      <div className="workflow-kpis">
        <article><span>Shifts today</span><strong>{todayCoverage}</strong><CalendarDays size={18} /></article>
        <article><span>Departments covered today</span><strong>{departmentsToday}</strong><Users size={18} /></article>
        {roleCounts.map(({ role, count }) => <article key={role}><span>{role} shifts · selected date</span><strong>{count}</strong><Clock3 size={18} /></article>)}
      </div>

      {showForm && <form className="workflow-form-panel" onSubmit={saveShift}>
        <div className="workflow-panel-heading"><div><h2>Schedule staff shift</h2><p>Overlapping shifts for the same staff member are blocked.</p></div><button className="workflow-button subtle" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        <div className="workflow-form-grid">
          <label>Staff ID<input required value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} /></label>
          <label>Staff name<input required value={form.staffName} onChange={(e) => setForm({ ...form, staffName: e.target.value })} /></label>
          <label>Role<select value={form.staffRole} onChange={(e) => setForm({ ...form, staffRole: e.target.value })}><option>Doctor</option><option>Nurse</option><option>Technician</option><option>Pharmacist</option><option>Administrator</option></select></label>
          <label>Department<input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
          <label>Shift date<input required type="date" value={form.shiftDate} onChange={(e) => setForm({ ...form, shiftDate: e.target.value })} /></label>
          <label>Start time<input required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></label>
          <label>End time<input required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></label>
          <label className="workflow-form-wide">Handover notes<textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        </div>
        <div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy} type="submit">Save shift</button></div>
      </form>}

      <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>Shift roster</h2><p>{filteredShifts.length} shifts scheduled</p></div><div className="workflow-toolbar-actions"><label className="workflow-date-filter">Date<input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} /></label><button className="workflow-button subtle" type="button" onClick={refresh}><RefreshCw size={15} /> Refresh</button></div></div>
        {loading ? <div className="workflow-empty">Loading shifts…</div> : !filteredShifts.length ? <div className="workflow-empty">No shifts scheduled for this date.</div> : <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Staff member</th><th>Role / department</th><th>Date</th><th>Hours</th><th>Status</th><th>Action</th></tr></thead><tbody>{filteredShifts.map((shift) => <tr key={shift.id}><td><strong>{shift.staffName}</strong><small>{shift.staffId}</small></td><td>{shift.staffRole}<small>{shift.department}</small></td><td>{shift.shiftDate}</td><td>{shift.startTime}–{shift.endTime}</td><td><select className="workflow-status-select" value={shift.status} disabled={busy} onChange={(e) => updateStatus(shift, e.target.value)}><option value="SCHEDULED">Scheduled</option><option value="ON_DUTY">On duty</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option></select></td><td><button type="button" className="workflow-icon-button" aria-label={`Remove shift for ${shift.staffName}`} title="Remove shift" disabled={busy} onClick={() => deleteShift(shift.id)}><Trash2 size={15} /></button></td></tr>)}</tbody></table></div>}
      </section>
    </section>
  );
}
