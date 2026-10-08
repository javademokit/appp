import { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Clock3, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { apiFetch } from '../API/api';
import './Operations.css';

async function readResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'Request failed');
  return data;
}

const today = (() => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
})();
const initialForm = { staffId: '', staffName: '', staffRole: 'Nurse', department: '', shiftDate: today, startTime: '08:00', endTime: '16:00', notes: '' };
const initialWalkInForm = { firstName: '', lastName: '', mobile: '', email: '', qualification: '', licenseNumber: '', specialization: '' };

export default function StaffShiftsPage() {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dateFilter, setDateFilter] = useState(today);
  const [form, setForm] = useState(initialForm);
  const [nurses, setNurses] = useState([]);
  const [nursesLoading, setNursesLoading] = useState(false);
  const [showWalkInForm, setShowWalkInForm] = useState(false);
  const [walkInForm, setWalkInForm] = useState(initialWalkInForm);
  const [creatingNurse, setCreatingNurse] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setError('');
    try { setShifts(await readResponse(await apiFetch('/staff/shifts'))); }
    catch (requestError) { setError(requestError.message || 'Could not load staff shifts'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (form.staffRole !== 'Nurse') return undefined;
    let active = true;
    setNursesLoading(true);
    apiFetch('/nursing/nurses')
      .then(readResponse)
      .then((result) => {
        if (active) {
          setNurses(result.filter((nurse) => nurse.employmentActive
            && (!nurse.profileComplete || nurse.status === 'ACTIVE')));
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Could not load nurses');
      })
      .finally(() => {
        if (active) setNursesLoading(false);
      });
    return () => { active = false; };
  }, [form.staffRole]);

  const createWalkInNurse = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setCreatingNurse(true);
    try {
      const created = await readResponse(await apiFetch('/nursing/nurses/walk-in', {
        method: 'POST',
        body: JSON.stringify(walkInForm),
      }));
      if (!created.employeeCode) throw new Error('Walk-in nurse was created without an employee ID. Please refresh the nurse directory.');
      const nurse = {
        employeeCode: created.employeeCode,
        name: `${created.firstName || walkInForm.firstName} ${created.lastName || walkInForm.lastName}`.trim(),
        employmentActive: true,
        profileComplete: true,
        status: 'ACTIVE',
        walkIn: true,
      };
      setNurses((current) => [...current.filter((entry) => entry.employeeCode !== nurse.employeeCode), nurse]);
      setForm((current) => ({
        ...current,
        staffRole: 'Nurse',
        staffId: nurse.employeeCode,
        staffName: nurse.name,
      }));
      setWalkInForm(initialWalkInForm);
      setShowWalkInForm(false);
      setSuccess(`Walk-in nurse ${nurse.employeeCode} created. Complete the shift details and save the shift.`);
    } catch (requestError) {
      setError(requestError.message || 'Could not create walk-in nurse');
    } finally {
      setCreatingNurse(false);
    }
  };

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

  const recordAttendance = async (shift, action) => {
    setBusy(true); setError(''); setSuccess('');
    try {
      const result = await readResponse(await apiFetch(
        `/staff/shifts/${shift.id}/${action}`,
        { method: 'POST' },
      ));
      setSuccess(`${result.staffName} ${action === 'check-in' ? 'checked in' : 'checked out'} successfully.`);
      await refresh();
    } catch (requestError) { setError(requestError.message || 'Could not record doctor attendance'); }
    finally { setBusy(false); }
  };

  const filteredShifts = shifts.filter((shift) => !dateFilter || shift.shiftDate === dateFilter);
  const todayCoverage = shifts.filter((shift) => shift.shiftDate === today && shift.status !== 'CANCELLED').length;
  const departmentsToday = new Set(shifts.filter((shift) => shift.shiftDate === today).map((shift) => shift.department)).size;
  const roleCounts = ['Doctor', 'Nurse', 'Technician'].map((role) => ({ role, count: filteredShifts.filter((shift) => shift.staffRole === role).length }));

  return (
    <section className="workflow-page" aria-labelledby="staff-shifts-title">
      <header className="workflow-header">
        <div><p className="workflow-eyebrow">People operations</p><h1 id="staff-shifts-title">Staff &amp; shift management</h1><p>Select an existing nurse or add a walk-in nurse, then schedule their shift.</p></div>
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
        <div className="workflow-panel-heading"><div><h2>Schedule staff shift</h2><p>Each nurse shift uses the nurse's employee ID. The same nurse can be scheduled for multiple shifts.</p></div><button className="workflow-button subtle" type="button" onClick={() => setShowForm(false)}>Cancel</button></div>
        <div className="workflow-form-grid">
          {form.staffRole === 'Nurse'
            ? <label>Nurse<select required value={form.staffId} disabled={nursesLoading} onChange={(event) => {
              const nurse = nurses.find((entry) => entry.employeeCode === event.target.value);
              setForm({ ...form, staffId: nurse?.employeeCode || '', staffName: nurse?.name || '' });
            }}>
              <option value="">{nursesLoading ? 'Loading nurses…' : nurses.length ? 'Select an active nurse' : 'No active nurse employees found'}</option>
              {nurses.map((nurse) => <option key={nurse.employeeCode} value={nurse.employeeCode}>
                {nurse.employeeCode} · {nurse.name}{nurse.walkIn ? ' · Walk-in' : !nurse.profileComplete ? ' · Profile setup needed' : ''}
              </option>)}
            </select></label>
            : <label>Staff ID<input required value={form.staffId} onChange={(event) => setForm({ ...form, staffId: event.target.value })} /></label>}
          <label>Staff name<input required readOnly={form.staffRole === 'Nurse'} value={form.staffName} onChange={(event) => setForm({ ...form, staffName: event.target.value })} /></label>
          <label>Role<select value={form.staffRole} onChange={(event) => {
            setForm({ ...form, staffRole: event.target.value, staffId: '', staffName: '' });
            setShowWalkInForm(false);
          }}><option>Doctor</option><option>Nurse</option><option>Technician</option><option>Pharmacist</option><option>Administrator</option></select></label>
          <label>Department<input required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></label>
          <label>Shift date<input required type="date" value={form.shiftDate} onChange={(e) => setForm({ ...form, shiftDate: e.target.value })} /></label>
          <label>Start time<input required type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} /></label>
          <label>End time<input required type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} /></label>
          <label className="workflow-form-wide">Handover notes<textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
        </div>
        {form.staffRole === 'Nurse' && <div className="workflow-form-actions">
          <button className="workflow-button subtle" type="button" onClick={() => setShowWalkInForm((shown) => !shown)}>
            {showWalkInForm ? 'Cancel walk-in nurse' : 'Add walk-in nurse'}
          </button>
        </div>}
        {showWalkInForm && form.staffRole === 'Nurse' && <section className="workflow-panel" aria-label="Add walk-in nurse">
          <div className="workflow-panel-heading"><div><h3>Walk-in nurse details</h3><p>Creates one active nurse record with an NR-WK employee ID and no login account.</p></div></div>
          <div className="workflow-form-grid">
            <label>First name<input required value={walkInForm.firstName} onChange={(event) => setWalkInForm({ ...walkInForm, firstName: event.target.value })} /></label>
            <label>Last name<input required value={walkInForm.lastName} onChange={(event) => setWalkInForm({ ...walkInForm, lastName: event.target.value })} /></label>
            <label>Mobile number<input required type="tel" value={walkInForm.mobile} onChange={(event) => setWalkInForm({ ...walkInForm, mobile: event.target.value })} /></label>
            <label>Email (optional)<input type="email" value={walkInForm.email} onChange={(event) => setWalkInForm({ ...walkInForm, email: event.target.value })} /></label>
            <label>Qualification<input value={walkInForm.qualification} onChange={(event) => setWalkInForm({ ...walkInForm, qualification: event.target.value })} /></label>
            <label>Registration number<input value={walkInForm.licenseNumber} onChange={(event) => setWalkInForm({ ...walkInForm, licenseNumber: event.target.value })} /></label>
            <label>Specialization<input value={walkInForm.specialization} onChange={(event) => setWalkInForm({ ...walkInForm, specialization: event.target.value })} /></label>
          </div>
          <div className="workflow-form-actions"><button className="workflow-button primary" type="button" disabled={creatingNurse || busy} onClick={(event) => createWalkInNurse(event)}>
            {creatingNurse ? 'Creating nurse…' : 'Create nurse and continue'}
          </button></div>
        </section>}
        <div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy} type="submit">Save shift</button></div>
      </form>}

      <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>Shift roster</h2><p>{filteredShifts.length} shifts scheduled</p></div><div className="workflow-toolbar-actions"><label className="workflow-date-filter">Date<input type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} /></label><button className="workflow-button subtle" type="button" onClick={refresh}><RefreshCw size={15} /> Refresh</button></div></div>
        {loading ? <div className="workflow-empty">Loading shifts…</div> : !filteredShifts.length ? <div className="workflow-empty">No shifts scheduled for this date.</div> : <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Staff member</th><th>Role / department</th><th>Date</th><th>Shift hours</th><th>Attendance</th><th>Check-in / out</th><th>Action</th></tr></thead><tbody>{filteredShifts.map((shift) => <tr key={shift.id}><td><strong>{shift.staffName}</strong><small>{shift.staffId}</small></td><td>{shift.staffRole}<small>{shift.department}</small></td><td>{shift.shiftDate}</td><td>{shift.startTime}–{shift.endTime}</td><td><span className={`workflow-status ${shift.status === 'ON_DUTY' ? 'ready' : shift.status === 'COMPLETED' ? 'neutral' : shift.status === 'CANCELLED' ? 'critical' : 'warning'}`}>{shift.status.replace('_', ' ')}</span></td><td><small>In: {shift.checkInAt ? new Date(shift.checkInAt).toLocaleTimeString() : '—'}</small><small>Out: {shift.checkOutAt ? new Date(shift.checkOutAt).toLocaleTimeString() : '—'}</small></td><td className="attendance-actions">{shift.staffRole.toLowerCase() === 'doctor' && shift.shiftDate === today && shift.status === 'SCHEDULED' && <button className="workflow-button subtle" type="button" disabled={busy} onClick={() => recordAttendance(shift, 'check-in')}>Check in</button>}{shift.staffRole.toLowerCase() === 'doctor' && shift.shiftDate === today && shift.status === 'ON_DUTY' && <button className="workflow-button subtle" type="button" disabled={busy} onClick={() => recordAttendance(shift, 'check-out')}>Check out</button>}{shift.status === 'SCHEDULED' && <button type="button" className="workflow-icon-button" aria-label={`Cancel shift for ${shift.staffName}`} title="Cancel shift" disabled={busy} onClick={() => updateStatus(shift, 'CANCELLED')}><Trash2 size={15} /></button>}</td></tr>)}</tbody></table></div>}
      </section>
    </section>
  );
}
