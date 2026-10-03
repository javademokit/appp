import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { apiFetch } from '../API/api';
import '../Operations/Operations.css';
import './WardManagement.css';

const managerRoles = [
  'SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN', 'CRM_EXECUTIVE', 'HEAD_NURSE',
];

const errorMessage = async (response, fallback) => {
  const body = await response.json().catch(() => ({}));
  return body.message || body.detail || body.title || fallback;
};

const request = async (path, options) => {
  const response = await apiFetch(path, options);
  if (!response.ok) throw new Error(await errorMessage(response, `Request failed (${response.status})`));
  return response.status === 204 ? null : response.json();
};

const isOverdue = (record) => record.status === 'PENDING'
  && record.dueAt && new Date(record.dueAt).getTime() < Date.now();

const hasAbnormalVitals = (record) => {
  const text = `${record.description || ''} ${record.value || ''}`.toLowerCase();
  if (/\b(abnormal|critical|dangerously high|dangerously low)\b/.test(text)) return true;
  try {
    const measurements = typeof record.value === 'string' ? JSON.parse(record.value) : record.value;
    if (!measurements || typeof measurements !== 'object') return false;
    return Object.entries(measurements).some(([name, rawValue]) => {
      const value = Number.parseFloat(rawValue);
      const key = name.toLowerCase();
      if (key.includes('bloodpressure') || key === 'bp') {
        const systolic = Number.parseFloat(String(rawValue).split('/')[0]);
        return Number.isFinite(systolic) && (systolic < 90 || systolic >= 140);
      }
      if (!Number.isFinite(value)) return false;
      if (key.includes('spo2') || key.includes('oxygen')) return value < 92;
      if (key.includes('temperature') || key === 'temp') return value >= 38;
      if (key.includes('systolic')) return value < 90 || value >= 140;
      if (key.includes('heartrate') || key.includes('pulse')) return value < 50 || value > 120;
      return false;
    });
  } catch {
    return false;
  }
};

const downloadCsv = (filename, rows) => {
  const csv = rows.map((row) => row.map((cell) => {
    const value = String(cell ?? '').replaceAll('"', '""');
    return `"${value}"`;
  }).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

function NurseDashboard({ dashboard, handovers, nurses, rosters, shiftSwaps, refresh, reviewSwaps, setError, setSuccess }) {
  const [busyKey, setBusyKey] = useState('');
  const [careForms, setCareForms] = useState({});
  const [handoverForms, setHandoverForms] = useState({});
  const [swapForm, setSwapForm] = useState({ rosterId: '', toNurseId: '', date: '', note: '' });

  const updateCareForm = (patientId, key, value) => {
    setCareForms((current) => ({
      ...current,
      [patientId]: { type: 'NOTE', ...(current[patientId] || {}), [key]: value },
    }));
  };

  const addCareRecord = async (event, patientId) => {
    event.preventDefault();
    const form = careForms[patientId] || {};
    setBusyKey(`care-${patientId}`);
    setError('');
    setSuccess('');
    try {
      await request(`/nursing/patients/${encodeURIComponent(patientId)}/care-records`, {
        method: 'POST',
        body: JSON.stringify({
          type: form.type || 'NOTE',
          description: form.description || '',
          value: form.value || '',
          dueAt: form.dueAt || '',
        }),
      });
      setCareForms((current) => ({ ...current, [patientId]: { type: 'NOTE', description: '', value: '', dueAt: '' } }));
      setSuccess('Care record saved.');
      await refresh();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusyKey('');
    }
  };

  const completeRecord = async (patientId, recordId) => {
    setBusyKey(recordId);
    setError('');
    try {
      await request(`/nursing/patients/${encodeURIComponent(patientId)}/care-records/${encodeURIComponent(recordId)}/complete`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setSuccess('Task marked complete.');
      await refresh();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusyKey('');
    }
  };

  const submitHandover = async (event, patientId) => {
    event.preventDefault();
    const form = handoverForms[patientId] || {};
    setBusyKey(`handover-${patientId}`);
    setError('');
    setSuccess('');
    try {
      await request(`/nursing/patients/${encodeURIComponent(patientId)}/handovers`, {
        method: 'POST',
        body: JSON.stringify({ nurseId: form.nurseId, shift: form.shift, note: form.note }),
      });
      setHandoverForms((current) => ({ ...current, [patientId]: { nurseId: '', shift: '', note: '' } }));
      setSuccess('Handover sent to the incoming nurse.');
      await refresh();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusyKey('');
    }
  };

  const acknowledge = async (handoverId) => {
    setBusyKey(handoverId);
    setError('');
    try {
      await request(`/nursing/handovers/${encodeURIComponent(handoverId)}/acknowledge`, { method: 'POST' });
      setSuccess('Handover acknowledged; the patient is now assigned to you.');
      await refresh();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusyKey('');
    }
  };

  const submitSwapRequest = async (event) => {
    event.preventDefault();
    const roster = rosters.find((entry) => entry.id === swapForm.rosterId);
    if (!roster) return;
    setBusyKey('shift-swap');
    setError('');
    setSuccess('');
    try {
      await request('/nursing/shift-swaps', {
        method: 'POST',
        body: JSON.stringify({
          toNurseId: swapForm.toNurseId,
          wardId: roster.wardId,
          shift: roster.shift,
          date: swapForm.date,
          note: swapForm.note,
        }),
      });
      setSwapForm({ rosterId: '', toNurseId: '', date: '', note: '' });
      setSuccess('Shift swap request submitted for Head Nurse approval.');
      await refresh();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusyKey('');
    }
  };

  const reviewSwap = async (swapId, approve) => {
    setBusyKey(swapId);
    setError('');
    try {
      await request(`/nursing/shift-swaps/${encodeURIComponent(swapId)}/decision`, {
        method: 'POST',
        body: JSON.stringify({ approve }),
      });
      setSuccess(`Shift swap ${approve ? 'approved' : 'declined'}.`);
      await refresh();
    } catch (error) {
      setError(error.message);
    } finally {
      setBusyKey('');
    }
  };

  return (
    <>
      <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>My assigned patients</h2><p>Only patients currently assigned to your nurse account appear here.</p></div></div>
        {!dashboard.length ? <div className="workflow-empty">No patients are assigned to you for the current shift.</div>
          : <div className="workflow-table-wrap"><table className="workflow-table">
            <thead><tr><th>Patient</th><th>Ward / bed</th><th>Diagnosis &amp; allergies</th><th>Care &amp; latest vitals</th><th>Shift handover</th></tr></thead>
            <tbody>{dashboard.map((item) => {
              const patient = item.patient || {};
              const patientId = patient.patientId || item.assignment?.patientId;
              const records = item.careRecords || [];
              const latestVitals = item.latestConsultation ? {
                description: '',
                value: JSON.stringify({
                  bloodPressure: item.latestConsultation.bloodPressure,
                  pulse: item.latestConsultation.pulse,
                  temperature: item.latestConsultation.temperature,
                  oxygenSaturation: item.latestConsultation.oxygenSaturation,
                }),
              } : records.find((record) => record.type === 'VITALS');
              const vitalsText = item.latestConsultation
                ? [
                  item.latestConsultation.bloodPressure && `BP ${item.latestConsultation.bloodPressure}`,
                  item.latestConsultation.pulse && `Pulse ${item.latestConsultation.pulse}`,
                  item.latestConsultation.temperature && `Temp ${item.latestConsultation.temperature}`,
                  item.latestConsultation.oxygenSaturation && `SpO2 ${item.latestConsultation.oxygenSaturation}`,
                ].filter(Boolean).join(' · ')
                : latestVitals?.value || latestVitals?.description || 'No readings recorded';
              const form = careForms[patientId] || { type: 'NOTE' };
              const handover = handoverForms[patientId] || {};
              return <tr key={item.assignment?.id || patientId}>
                <td><strong>{patient.patientName || 'Patient'}</strong><small>{patientId} · {patient.patientAge || 'Age not recorded'}</small></td>
                <td>{item.ward?.name || patient.patientWardnum || 'Ward'}<small>{item.bed?.bedNumber || 'Bed not recorded'} · {item.assignment?.role}</small></td>
                <td>{item.latestConsultation?.diagnosis || patient.patientPrescription || 'Diagnosis not recorded'}<small>Allergies: {patient.patientAllergies || 'None recorded'}</small></td>
                <td>
                  {latestVitals && <p className={hasAbnormalVitals(latestVitals) ? 'workflow-alert error' : ''}>
                    Latest vitals: {vitalsText}
                    {hasAbnormalVitals(latestVitals) && <strong> · Check abnormal reading</strong>}
                  </p>}
                  <ul>{records.filter((record) => record.status === 'PENDING').map((record) => (
                    <li key={record.id} className={isOverdue(record) ? 'workflow-alert error' : ''}>
                      {record.type}: {record.description || record.value || 'Pending task'}
                      {isOverdue(record) && <strong> · Overdue</strong>}
                      <button className="workflow-button subtle" type="button" disabled={busyKey === record.id}
                        onClick={() => completeRecord(patientId, record.id)}>Mark done</button>
                    </li>
                  ))}</ul>
                  <form className="workflow-form-grid" onSubmit={(event) => addCareRecord(event, patientId)}>
                    <label>Record type<select value={form.type || 'NOTE'} onChange={(event) => updateCareForm(patientId, 'type', event.target.value)}>
                      <option value="NOTE">Note</option><option value="VITALS">Vitals</option><option value="MEDICATION">Medicine</option><option value="TASK">Task</option>
                    </select></label>
                    <label>Details<input required value={form.description || ''} onChange={(event) => updateCareForm(patientId, 'description', event.target.value)} /></label>
                    {form.type === 'VITALS' && <label>Vitals (JSON or reading)<input value={form.value || ''} placeholder='{"temperature": 37}' onChange={(event) => updateCareForm(patientId, 'value', event.target.value)} /></label>}
                    {form.type === 'MEDICATION' && <label>Due at<input type="datetime-local" value={form.dueAt || ''} onChange={(event) => updateCareForm(patientId, 'dueAt', event.target.value)} /></label>}
                    <button className="workflow-button primary" type="submit" disabled={busyKey === `care-${patientId}`}>Save care</button>
                  </form>
                </td>
                <td><form className="workflow-form-grid" onSubmit={(event) => submitHandover(event, patientId)}>
                  <label>Incoming nurse<select required value={handover.nurseId || ''} onChange={(event) => setHandoverForms((current) => ({ ...current, [patientId]: { ...current[patientId], nurseId: event.target.value } }))}>
                    <option value="">Select nurse</option>{nurses.filter((nurse) => nurse.profileComplete && nurse.status === 'ACTIVE' && nurse.id !== item.assignment?.nurseId).map((nurse) => <option key={nurse.id} value={nurse.id}>{nurse.name}</option>)}
                  </select></label>
                  <label>Incoming shift<select required value={handover.shift || ''} onChange={(event) => setHandoverForms((current) => ({ ...current, [patientId]: { ...current[patientId], shift: event.target.value } }))}>
                    <option value="">Select shift</option><option value="MORNING">Morning</option><option value="EVENING">Evening</option><option value="NIGHT">Night</option>
                  </select></label>
                  <label>Handover notes<textarea required value={handover.note || ''} onChange={(event) => setHandoverForms((current) => ({ ...current, [patientId]: { ...current[patientId], note: event.target.value } }))} /></label>
                  <button className="workflow-button primary" type="submit" disabled={busyKey === `handover-${patientId}`}>Send handover</button>
                </form></td>
              </tr>;
            })}</tbody>
          </table></div>}
      </section>
      <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>Incoming handovers</h2><p>Patients transfer to you only after you acknowledge their handover.</p></div></div>
        {!handovers.length ? <div className="workflow-empty">No pending handovers.</div> : <div className="workflow-table-wrap"><table className="workflow-table">
          <thead><tr><th>Patient ID</th><th>From nurse</th><th>Shift</th><th>Notes</th><th>Action</th></tr></thead>
          <tbody>{handovers.map((handover) => <tr key={handover.id}><td>{handover.patientId}</td><td>{handover.fromNurseId}</td><td>{handover.shift}</td><td>{handover.note}</td>
            <td><button className="workflow-button primary" type="button" disabled={busyKey === handover.id} onClick={() => acknowledge(handover.id)}>Acknowledge</button></td></tr>)}</tbody>
        </table></div>}
      </section>
      <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>Shift swaps</h2><p>Requests require Head Nurse approval and both nurses must be rostered on that ward and shift.</p></div></div>
        <form className="workflow-form-grid" onSubmit={submitSwapRequest}>
          <label>Your rostered shift<select required value={swapForm.rosterId} onChange={(event) => setSwapForm({ ...swapForm, rosterId: event.target.value })}>
            <option value="">Select roster entry</option>{rosters.map((roster) => <option key={roster.id} value={roster.id}>{roster.wardId} · {roster.shift} · {roster.startDate} to {roster.endDate}</option>)}
          </select></label>
          <label>Swap with<select required value={swapForm.toNurseId} onChange={(event) => setSwapForm({ ...swapForm, toNurseId: event.target.value })}>
            <option value="">Select nurse</option>{nurses.filter((nurse) => nurse.profileComplete && nurse.status === 'ACTIVE'
              && nurse.id !== rosters.find((roster) => roster.id === swapForm.rosterId)?.nurseId).map((nurse) => <option key={nurse.id} value={nurse.id}>{nurse.name}</option>)}
          </select></label>
          <label>Shift date<input required type="date" value={swapForm.date} onChange={(event) => setSwapForm({ ...swapForm, date: event.target.value })} /></label>
          <label>Reason<input value={swapForm.note} onChange={(event) => setSwapForm({ ...swapForm, note: event.target.value })} /></label>
          <button className="workflow-button primary" type="submit" disabled={busyKey === 'shift-swap' || !rosters.length}>Request approval</button>
        </form>
        {!shiftSwaps.length ? <div className="workflow-empty">No shift swap requests.</div> : <div className="workflow-table-wrap"><table className="workflow-table">
          <thead><tr><th>Shift date</th><th>Ward / shift</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Review</th></tr></thead>
          <tbody>{shiftSwaps.map((swap) => <tr key={swap.id}><td>{swap.date}</td><td>{swap.wardId}<small>{swap.shift}</small></td><td>{swap.fromNurseId}</td><td>{swap.toNurseId}</td><td>{swap.note || '—'}</td><td>{swap.status}</td>
            <td>{reviewSwaps && swap.status === 'PENDING' && <div className="workflow-toolbar-actions">
              <button className="workflow-button primary" type="button" disabled={busyKey === swap.id} onClick={() => reviewSwap(swap.id, true)}>Approve</button>
              <button className="workflow-button subtle" type="button" disabled={busyKey === swap.id} onClick={() => reviewSwap(swap.id, false)}>Decline</button>
            </div>}</td></tr>)}</tbody>
        </table></div>}
      </section>
    </>
  );
}

export default function WardManagement() {
  const [currentUser, setCurrentUser] = useState(null);
  const [wards, setWards] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [nurseRosters, setNurseRosters] = useState([]);
  const [shiftSwaps, setShiftSwaps] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentBoard, setAssignmentBoard] = useState([]);
  const [unassignedPatients, setUnassignedPatients] = useState([]);
  const [careRecords, setCareRecords] = useState([]);
  const [dashboard, setDashboard] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [wardForm, setWardForm] = useState({ name: '', type: 'GENERAL', maxPatientsPerNurse: 8, minimumNursesPerShift: 1 });
  const [nurseForm, setNurseForm] = useState({ accountId: '', name: '', employeeId: '', phone: '', qualification: '', licenseNumber: '', designation: 'STAFF_NURSE', specialization: 'GENERAL', status: 'ACTIVE', photoUrl: '' });
  const [rosterForm, setRosterForm] = useState({ nurseId: '', wardId: '', shift: 'MORNING', startDate: '', endDate: '' });
  const [bulkForm, setBulkForm] = useState({ wardId: '', nurseId: '', shift: 'MORNING', bedFrom: '', bedTo: '' });
  const canManage = useMemo(() => (currentUser?.roles || []).some((role) => managerRoles.includes(String(role).replace(/^ROLE_/, '').toUpperCase())), [currentUser]);
  const isNurse = useMemo(() => (currentUser?.roles || []).some((role) => ['NURSE', 'HEAD_NURSE'].includes(String(role).replace(/^ROLE_/, '').toUpperCase())), [currentUser]);
  const canSetupWards = useMemo(() => (currentUser?.roles || []).some((role) => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN'].includes(String(role).replace(/^ROLE_/, '').toUpperCase())), [currentUser]);
  const canManageStaff = canSetupWards || (currentUser?.roles || []).some((role) => String(role).replace(/^ROLE_/, '').toUpperCase() === 'HEAD_NURSE');
  const canReviewSwaps = useMemo(() => (currentUser?.roles || []).some((role) => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN', 'HEAD_NURSE'].includes(String(role).replace(/^ROLE_/, '').toUpperCase())), [currentUser]);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const userResponse = await apiFetch('/users/me');
      if (!userResponse.ok) throw new Error(await errorMessage(userResponse, 'Could not load user permissions'));
      const userData = await userResponse.json();
      setCurrentUser(userData);
      const roles = (userData.roles || []).map((role) => String(role).replace(/^ROLE_/, '').toUpperCase());
      const manager = roles.some((role) => managerRoles.includes(role));
      if (manager) {
        const paths = ['/nursing/wards', '/nursing/nurses', '/nursing/rosters', '/nursing/assignments', '/nursing/unassigned-patients', '/nursing/shift-swaps', '/nursing/patients/assignments'];
        const results = await Promise.all(paths.map((path) => request(path)));
        [setWards, setNurses, setRosters, setAssignments, setUnassignedPatients, setShiftSwaps, setAssignmentBoard]
          .forEach((setter, index) => setter(results[index]));
        if (roles.some((role) => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN', 'HEAD_NURSE'].includes(role))) {
          setCareRecords(await request('/nursing/care-records'));
        } else {
          setCareRecords([]);
        }
        if (roles.includes('NURSE') || roles.includes('HEAD_NURSE')) {
          const [myPatients, incoming, myRoster] = await Promise.all([
            request('/nursing/dashboard'), request('/nursing/handovers'), request('/nursing/rosters/mine'),
          ]);
          setDashboard(myPatients);
          setHandovers(incoming);
          setNurseRosters(myRoster);
        }
      } else if (roles.includes('NURSE')) {
        const [myPatients, incoming, nurseData, myRoster, swaps] = await Promise.all([
          request('/nursing/dashboard'), request('/nursing/handovers'), request('/nursing/nurses'),
          request('/nursing/rosters/mine'), request('/nursing/shift-swaps'),
        ]);
        setDashboard(myPatients);
        setHandovers(incoming);
        setNurses(nurseData);
        setNurseRosters(myRoster);
        setShiftSwaps(swaps);
      } else {
        throw new Error('Your account does not have access to nursing management.');
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not load nursing management.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const submit = async (path, method, body, successMessage) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      await request(path, { method, body: JSON.stringify(body) });
      setSuccess(successMessage);
      await refresh();
      return true;
    } catch (requestError) {
      setError(requestError.message || 'Request failed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveNurseProfile = async (event) => {
    event.preventDefault();
    if (!nurseForm.accountId) return;
    const { accountId, ...profile } = nurseForm;
    await submit(`/nursing/nurses/${encodeURIComponent(accountId)}/profile`, 'PUT', profile, 'Nurse profile saved.');
  };

  const saveBedStatus = async (wardId, bed) => {
    const nextStatus = bed.status === 'RESERVED' ? 'VACANT' : 'RESERVED';
    await submit(`/nursing/wards/${encodeURIComponent(wardId)}/beds/${encodeURIComponent(bed.id)}`, 'PUT', { status: nextStatus }, `Bed ${bed.bedNumber} marked ${nextStatus.toLowerCase()}.`);
  };

  const submitBulkAssignment = async (event) => {
    event.preventDefault();
    const ok = await submit(`/nursing/wards/${encodeURIComponent(bulkForm.wardId)}/assignments`, 'POST', {
      nurseId: bulkForm.nurseId, role: 'PRIMARY', shift: bulkForm.shift,
      bedFrom: bulkForm.bedFrom || null, bedTo: bulkForm.bedTo || null,
    }, 'Ward patient assignments updated.');
    if (ok) setBulkForm((current) => ({ ...current, bedFrom: '', bedTo: '' }));
  };

  const assignUnassigned = async (event, patient) => {
    event.preventDefault();
    const nurseId = event.currentTarget.elements.nurseId.value;
    const role = event.currentTarget.elements.role.value;
    await submit(`/nursing/patients/${encodeURIComponent(patient.patientId)}/assignments`, 'POST', {
      nurseId, role, shift: null,
    }, `${patient.patientName} assigned as ${role.toLowerCase()} nurse.`);
  };

  const transferPatient = async (event, patient) => {
    event.preventDefault();
    const [wardId, bedId] = event.currentTarget.elements.targetBed.value.split('::');
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const updated = await request(`/nursing/patients/${encodeURIComponent(patient.patientId)}/transfer`, {
        method: 'PUT',
        body: JSON.stringify({ wardId, bedId }),
      });
      setSuccess(updated.patientNurseId
        ? `${updated.patientName} transferred and assigned to ${updated.patientNurseassign}.`
        : `${updated.patientName} transferred. No on-duty nurse had capacity; the patient is in the unassigned list.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  };

  const decideSwap = async (swap, approve) => {
    await submit(`/nursing/shift-swaps/${encodeURIComponent(swap.id)}/decision`, 'POST', { approve }, `Shift swap ${approve ? 'approved' : 'declined'}.`);
  };

  const rosterWeek = useMemo(() => {
    const monday = new Date();
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    return rosters.filter((roster) => new Date(`${roster.endDate}T00:00:00`) >= monday
      && new Date(`${roster.startDate}T00:00:00`) <= sunday);
  }, [rosters]);

  const exportReport = () => {
    const rows = [
      ['REPORT', 'TYPE', 'RECORD ID', 'PATIENT', 'NURSE', 'WARD', 'SHIFT', 'STATUS', 'FROM', 'TO', 'ASSIGNED BY', 'DETAILS'],
      ...assignments.map((item) => ['Assignment history', item.role, item.id, item.patientId, item.nurseId, item.wardId, item.shift, item.status, item.fromTime, item.toTime, item.assignedBy, item.source]),
      ...rosters.map((item) => ['Staffing roster', 'ROSTER', item.id, '', item.nurseId, item.wardId, item.shift, item.status, item.startDate, item.endDate, item.createdBy, '']),
      ...careRecords.map((item) => ['Care tasks', item.type, item.id, item.patientId, item.nurseId, '', '', `${item.status}${isOverdue(item) ? ' - OVERDUE' : ''}`, item.recordedAt, item.dueAt, '', `${item.description || ''} ${item.value || ''}`]),
      ...wards.map((item) => ['Ward staffing', item.type, item.id, '', item.nursesOnDuty, item.name, '', item.understaffed ? 'UNDERSTAFFED' : 'STAFFED', '', '', '', `vacant beds: ${item.vacantBeds}/${item.totalBeds}`]),
    ];
    downloadCsv('nursing-management-report.csv', rows);
  };

  if (loading) return <section className="workflow-page" aria-busy="true"><div className="workflow-empty">Loading nursing management…</div></section>;

  return (
    <section className="workflow-page" aria-labelledby="ward-management-title">
      <header className="workflow-header"><div><p className="workflow-eyebrow">Nursing operations</p><h1 id="ward-management-title">{canManage ? 'Nursing & Ward Management' : 'My Nursing Dashboard'}</h1>
        <p>{canManage ? 'Configure nurse profiles, ward beds, shifts, patient assignments, and staffing reports.' : 'Assigned patients, shift tasks, care notes, and patient handover.'}</p></div>
        <div className="workflow-toolbar-actions">
          {canManage && <>
            <button className="workflow-button subtle" type="button" onClick={exportReport}><Download size={15} /> Export Excel-compatible CSV</button>
            <button className="workflow-button subtle" type="button" onClick={() => window.print()}>Print / Save as PDF</button>
          </>}
          <button className="workflow-button subtle" type="button" onClick={refresh}><RefreshCw size={15} /> Refresh</button>
        </div>
      </header>
      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}
      {isNurse && <NurseDashboard dashboard={dashboard} handovers={handovers} nurses={nurses}
        rosters={nurseRosters} shiftSwaps={shiftSwaps} reviewSwaps={canReviewSwaps}
        refresh={refresh} setError={setError} setSuccess={setSuccess} />}
      {canManage && <>
        <section className="workflow-panel">
          <div className="workflow-panel-heading"><div><h2>Ward and bed setup</h2><p>{canSetupWards
            ? 'Create units, configure patient ratios and minimum shift staffing, then add beds.'
            : 'Review wards assigned to you, manage their beds, and monitor shift staffing.'}</p></div></div>
          {canSetupWards && <>
          <form className="workflow-form-grid" onSubmit={(event) => {
            event.preventDefault();
            submit('/nursing/wards', 'POST', wardForm, 'Ward created. Add vacant beds below.');
            setWardForm({ name: '', type: 'GENERAL', maxPatientsPerNurse: 8, minimumNursesPerShift: 1 });
          }}>
            <label>Ward name<input required value={wardForm.name} onChange={(event) => setWardForm({ ...wardForm, name: event.target.value })} /></label>
            <label>Ward type<select value={wardForm.type} onChange={(event) => setWardForm({ ...wardForm, type: event.target.value })}>
              {['ICU', 'GENERAL', 'PRIVATE', 'PEDIATRICS', 'EMERGENCY', 'OTHER'].map((type) => <option key={type}>{type}</option>)}
            </select></label>
            <label>Maximum patients per nurse<input required type="number" min="1" value={wardForm.maxPatientsPerNurse} onChange={(event) => setWardForm({ ...wardForm, maxPatientsPerNurse: Number(event.target.value) })} /></label>
            <label>Minimum nurses per shift<input required type="number" min="0" value={wardForm.minimumNursesPerShift} onChange={(event) => setWardForm({ ...wardForm, minimumNursesPerShift: Number(event.target.value) })} /></label>
            <button className="workflow-button primary" disabled={busy} type="submit">Create ward</button>
          </form>
          </>}
          {!wards.length ? <div className="workflow-empty">No wards set up yet.</div> : <div className="workflow-table-wrap"><table className="workflow-table">
            <thead><tr><th>Ward</th><th>Ratio</th><th>Staffing today</th><th>Bed availability</th>{canManageStaff && <th>Add bed</th>}<th>Beds</th></tr></thead>
            <tbody>{wards.map((ward) => <tr key={ward.id}><td><strong>{ward.name}</strong><small>{ward.type}</small></td><td>1 nurse : {ward.maxPatientsPerNurse} patients</td>
              <td>{ward.nursesOnDuty}/{ward.minimumNursesPerShift} on duty{ward.understaffed && <strong className="workflow-alert error"> · Understaffed</strong>}</td>
              <td>{ward.vacantBeds} vacant / {ward.totalBeds}</td>
              {canManageStaff && <td><form className="nursing-inline-form" onSubmit={(event) => {
                event.preventDefault();
                const bedNumber = event.currentTarget.elements.bedNumber.value.trim();
                if (bedNumber) submit(`/nursing/wards/${encodeURIComponent(ward.id)}/beds`, 'POST', { bedNumber }, `Bed ${bedNumber} added to ${ward.name}.`);
                event.currentTarget.reset();
              }}><input aria-label={`New bed number for ${ward.name}`} name="bedNumber" required placeholder="Bed no." /><button className="workflow-button primary" type="submit" disabled={busy}>Add</button></form></td>
              }
              <td><div className="nursing-bed-list">{(ward.beds || []).map((bed) => canManageStaff
                ? <button className="workflow-button subtle" key={bed.id} type="button"
                  disabled={bed.status === 'OCCUPIED' || busy} onClick={() => saveBedStatus(ward.id, bed)} title="Toggle reservation status">
                  {bed.bedNumber} · {bed.status}
                </button>
                : <span key={bed.id}>{bed.bedNumber} · {bed.status}</span>)}</div></td>
            </tr>)}</tbody>
          </table></div>}
        </section>

        {canManageStaff && <section className="workflow-panel">
          <div className="workflow-panel-heading"><div><h2>Nurse profiles</h2><p>Link profiles to active staff accounts with the NURSE or HEAD_NURSE role.</p></div></div>
          <form className="workflow-form-grid" onSubmit={saveNurseProfile}>
            <label>Staff account<select required value={nurseForm.accountId} onChange={(event) => {
              const nurse = nurses.find((entry) => entry.id === event.target.value);
              setNurseForm({ ...nurseForm, accountId: event.target.value, ...(nurse?.profile || {}) });
            }}><option value="">Select nurse account</option>{nurses.map((nurse) => <option key={nurse.id} value={nurse.id}>{nurse.userId || nurse.emailId} {nurse.profileComplete ? `· ${nurse.name}` : '· profile required'}</option>)}</select></label>
            <label>Full name<input required value={nurseForm.name} onChange={(event) => setNurseForm({ ...nurseForm, name: event.target.value })} /></label>
            <label>Employee ID<input required value={nurseForm.employeeId} onChange={(event) => setNurseForm({ ...nurseForm, employeeId: event.target.value })} /></label>
            <label>Phone<input value={nurseForm.phone} onChange={(event) => setNurseForm({ ...nurseForm, phone: event.target.value })} /></label>
            <label>Qualification<input value={nurseForm.qualification} onChange={(event) => setNurseForm({ ...nurseForm, qualification: event.target.value })} /></label>
            <label>License number<input required value={nurseForm.licenseNumber} onChange={(event) => setNurseForm({ ...nurseForm, licenseNumber: event.target.value })} /></label>
            <label>Designation<select value={nurseForm.designation} onChange={(event) => setNurseForm({ ...nurseForm, designation: event.target.value })}>
              <option value="STAFF_NURSE">Staff Nurse</option><option value="SENIOR_NURSE">Senior Nurse</option><option value="HEAD_NURSE">Head Nurse</option>
            </select></label>
            <label>Specialization<input required value={nurseForm.specialization} onChange={(event) => setNurseForm({ ...nurseForm, specialization: event.target.value })} /></label>
            <label>Photo URL<input type="url" value={nurseForm.photoUrl} onChange={(event) => setNurseForm({ ...nurseForm, photoUrl: event.target.value })} /></label>
            <label>Status<select value={nurseForm.status} onChange={(event) => setNurseForm({ ...nurseForm, status: event.target.value })}>
              <option value="ACTIVE">Active</option><option value="ON_LEAVE">On leave</option><option value="INACTIVE">Inactive</option>
            </select></label>
            <button className="workflow-button primary" type="submit" disabled={busy || !nurseForm.accountId}>Save nurse profile</button>
          </form>
          <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Nurse</th><th>Employee ID</th><th>License</th><th>Designation</th><th>Specialization</th><th>Status</th><th>Workload</th></tr></thead>
            <tbody>{nurses.map((nurse) => <tr key={nurse.id}><td>{nurse.name || nurse.userId}</td><td>{nurse.profile?.employeeId || 'Profile needed'}</td><td>{nurse.profile?.licenseNumber || '—'}</td><td>{nurse.profile?.designation || '—'}</td><td>{nurse.profile?.specialization || '—'}</td><td>{nurse.status}</td>
              <td>{assignments.filter((assignment) => assignment.nurseId === nurse.id && assignment.status === 'ACTIVE' && assignment.role === 'PRIMARY').length} patients</td></tr>)}</tbody>
          </table></div>
        </section>}

        {canManageStaff && <section className="workflow-panel">
          <div className="workflow-panel-heading"><div><h2>Shift roster</h2><p>Weekly duty roster and shift staffing assignments.</p></div></div>
          <form className="workflow-form-grid" onSubmit={(event) => {
            event.preventDefault();
            submit('/nursing/rosters', 'POST', rosterForm, 'Nurse scheduled for the selected date range.');
          }}>
            <label>Nurse<select required value={rosterForm.nurseId} onChange={(event) => setRosterForm({ ...rosterForm, nurseId: event.target.value })}><option value="">Select active nurse</option>
              {nurses.filter((nurse) => nurse.profileComplete && nurse.status === 'ACTIVE').map((nurse) => <option key={nurse.id} value={nurse.id}>{nurse.name}</option>)}</select></label>
            <label>Ward<select required value={rosterForm.wardId} onChange={(event) => setRosterForm({ ...rosterForm, wardId: event.target.value })}><option value="">Select ward</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}</select></label>
            <label>Shift<select value={rosterForm.shift} onChange={(event) => setRosterForm({ ...rosterForm, shift: event.target.value })}><option value="MORNING">Morning</option><option value="EVENING">Evening</option><option value="NIGHT">Night</option></select></label>
            <label>Start date<input required type="date" value={rosterForm.startDate} onChange={(event) => setRosterForm({ ...rosterForm, startDate: event.target.value })} /></label>
            <label>End date<input required type="date" min={rosterForm.startDate || undefined} value={rosterForm.endDate} onChange={(event) => setRosterForm({ ...rosterForm, endDate: event.target.value })} /></label>
            <button className="workflow-button primary" type="submit" disabled={busy}>Add roster entry</button>
          </form>
          {!rosterWeek.length ? <div className="workflow-empty">No shifts scheduled this week.</div> : <div className="workflow-table-wrap"><table className="workflow-table">
            <thead><tr><th>Nurse</th><th>Ward</th><th>Shift</th><th>Date range</th><th>Status</th></tr></thead>
            <tbody>{rosterWeek.map((roster) => <tr key={roster.id}><td>{nurses.find((nurse) => nurse.id === roster.nurseId)?.name || roster.nurseId}</td><td>{wards.find((ward) => ward.id === roster.wardId)?.name || roster.wardId}</td><td>{roster.shift}</td><td>{roster.startDate} – {roster.endDate}</td><td>{roster.status}</td></tr>)}</tbody>
          </table></div>}
        </section>}

        {!isNurse && <section className="workflow-panel">
          <div className="workflow-panel-heading"><div><h2>Shift swap approvals</h2><p>Head Nurses and administrators approve or decline requests.</p></div></div>
          {!shiftSwaps.length ? <div className="workflow-empty">No shift swap requests.</div> : <div className="workflow-table-wrap"><table className="workflow-table">
            <thead><tr><th>Date</th><th>Ward / shift</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{shiftSwaps.map((swap) => <tr key={swap.id}><td>{swap.date}</td><td>{wards.find((ward) => ward.id === swap.wardId)?.name || swap.wardId}<small>{swap.shift}</small></td>
              <td>{nurses.find((nurse) => nurse.id === swap.fromNurseId)?.name || swap.fromNurseId}</td><td>{nurses.find((nurse) => nurse.id === swap.toNurseId)?.name || swap.toNurseId}</td>
              <td>{swap.note || '—'}</td><td>{swap.status}</td><td>{canReviewSwaps && swap.status === 'PENDING' && <div className="workflow-toolbar-actions">
                <button className="workflow-button primary" type="button" disabled={busy} onClick={() => decideSwap(swap, true)}>Approve</button>
                <button className="workflow-button subtle" type="button" disabled={busy} onClick={() => decideSwap(swap, false)}>Decline</button>
              </div>}</td></tr>)}</tbody>
          </table></div>}
        </section>}

        <section className="workflow-panel">
          <div className="workflow-panel-heading"><div><h2>Patient assignment</h2><p>Assign ward coverage, and maintain primary and backup nurse assignments per admitted patient.</p></div></div>
          <form className="workflow-form-grid" onSubmit={submitBulkAssignment}>
            <label>Ward<select required value={bulkForm.wardId} onChange={(event) => setBulkForm({ ...bulkForm, wardId: event.target.value })}><option value="">Select ward</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}</select></label>
            <label>Nurse<select required value={bulkForm.nurseId} onChange={(event) => setBulkForm({ ...bulkForm, nurseId: event.target.value })}><option value="">Select nurse</option>{nurses.filter((nurse) => nurse.profileComplete && nurse.status === 'ACTIVE').map((nurse) => <option key={nurse.id} value={nurse.id}>{nurse.name}</option>)}</select></label>
            <label>Shift<select value={bulkForm.shift} onChange={(event) => setBulkForm({ ...bulkForm, shift: event.target.value })}><option value="MORNING">Morning</option><option value="EVENING">Evening</option><option value="NIGHT">Night</option></select></label>
            <label>Bed from<input value={bulkForm.bedFrom} onChange={(event) => setBulkForm({ ...bulkForm, bedFrom: event.target.value })} placeholder="Optional" /></label>
            <label>Bed to<input value={bulkForm.bedTo} onChange={(event) => setBulkForm({ ...bulkForm, bedTo: event.target.value })} placeholder="Optional" /></label>
            <button className="workflow-button primary" type="submit" disabled={busy || !bulkForm.wardId || !bulkForm.nurseId}>Assign ward patients</button>
          </form>
          {!assignmentBoard.length ? <div className="workflow-empty">No admitted patients are in a ward.</div> : <div className="workflow-table-wrap"><table className="workflow-table">
            <thead><tr><th>Patient</th><th>Ward / bed</th><th>Primary nurse</th><th>Backup nurse</th><th>Assign / reassign</th><th>Transfer</th></tr></thead>
            <tbody>{assignmentBoard.map((entry) => {
              const patient = entry.patient;
              const primaryNurse = nurses.find((nurse) => nurse.id === entry.primary?.nurseId);
              const backupNurse = nurses.find((nurse) => nurse.id === entry.backup?.nurseId);
              const availableBeds = wards.flatMap((ward) => (ward.beds || [])
                .filter((bed) => bed.status === 'VACANT' && bed.id !== patient.patientBedId)
                .map((bed) => ({ ...bed, wardId: ward.id, wardName: ward.name })));
              return <tr key={patient.patientId}><td>{patient.patientName}<small>{patient.patientId}</small></td>
                <td>{patient.patientWardnum}<small>{wards.find((ward) => ward.id === patient.patientWardId)?.beds?.find((bed) => bed.id === patient.patientBedId)?.bedNumber || patient.patientBedId}</small></td>
                <td>{primaryNurse?.name || (entry.primary ? entry.primary.nurseId : 'Unassigned')}</td>
                <td>{backupNurse?.name || (entry.backup ? entry.backup.nurseId : 'Not assigned')}</td>
                <td><form className="nursing-inline-form" onSubmit={(event) => assignUnassigned(event, patient)}>
                  <select required name="role" defaultValue="PRIMARY"><option value="PRIMARY">Primary</option><option value="BACKUP">Backup</option></select>
                  <select required name="nurseId" defaultValue=""><option value="">Select nurse</option>{nurses.filter((nurse) => nurse.profileComplete && nurse.status === 'ACTIVE').map((nurse) => <option key={nurse.id} value={nurse.id}>{nurse.name}</option>)}</select>
                  <button className="workflow-button primary" disabled={busy}>Assign</button>
                </form></td>
                <td><form className="nursing-inline-form" onSubmit={(event) => transferPatient(event, patient)}>
                  <select required name="targetBed" defaultValue=""><option value="">Select vacant bed</option>{availableBeds.map((bed) => (
                    <option key={bed.id} value={`${bed.wardId}::${bed.id}`}>{bed.wardName} · {bed.bedNumber}</option>
                  ))}</select>
                  <button className="workflow-button subtle" type="submit" disabled={busy || !availableBeds.length}>Transfer</button>
                </form></td></tr>;
            })}</tbody>
          </table></div>}
          {unassignedPatients.length > 0 && <p className="workflow-alert error">{unassignedPatients.length} admitted patient(s) have no primary nurse.</p>}
        </section>

        <section className="workflow-panel">
          <div className="workflow-panel-heading"><div><h2>Assignment history &amp; outstanding care</h2><p>Audit of primary/backup assignments, handovers, and missed or overdue tasks.</p></div></div>
          <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Patient</th><th>Nurse</th><th>Role</th><th>Ward / shift</th><th>Assigned by</th><th>From / to</th><th>Status</th></tr></thead>
            <tbody>{assignments.map((assignment) => <tr key={assignment.id}><td>{assignment.patientId}</td><td>{nurses.find((nurse) => nurse.id === assignment.nurseId)?.name || assignment.nurseId}</td><td>{assignment.role}</td><td>{wards.find((ward) => ward.id === assignment.wardId)?.name || assignment.wardId}<small>{assignment.shift}</small></td><td>{assignment.assignedBy}</td><td>{assignment.fromTime}<small>{assignment.toTime || 'Current'}</small></td><td>{assignment.status}</td></tr>)}</tbody>
          </table></div>
          <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Patient</th><th>Nurse</th><th>Task</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>{careRecords.filter((record) => record.status === 'PENDING').map((record) => <tr key={record.id}><td>{record.patientId}</td><td>{nurses.find((nurse) => nurse.id === record.nurseId)?.name || record.nurseId}</td><td>{record.description || record.type}</td><td>{record.dueAt || 'Not specified'}</td><td>{isOverdue(record) ? 'OVERDUE' : 'PENDING'}</td></tr>)}</tbody>
          </table></div>
        </section>
      </>}
    </section>
  );
}
