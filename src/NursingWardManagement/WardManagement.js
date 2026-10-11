import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BedDouble, Ban, DoorOpen, Download, History, Plus, RefreshCw, Search, Sparkles, UserRoundCheck, Wrench } from 'lucide-react';
import { apiFetch } from '../API/api';
import { isAssignableNurse } from '../utils/nurseEligibility';
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

const nurseByIdentity = (nurses, id) => nurses.find((nurse) =>
  nurse.employeeCode === id || nurse.accountId === id || nurse.id === id);

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
                <td>{item.ward?.name || patient.patientWardnum || 'Ward'}<small>{item.bed?.room?.roomNumber ? `Room ${item.bed.room.roomNumber} · ` : ''}{item.bed?.bedNumber || 'Bed not recorded'} · {item.assignment?.role}</small></td>
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
                    <option value="">Select nurse</option>{nurses.filter((nurse) => isAssignableNurse(nurse)
                      && nurse.employeeCode !== item.assignment?.nurseId).map((nurse) => <option key={nurse.employeeCode} value={nurse.employeeCode}>{nurse.name} · {nurse.employeeCode}</option>)}
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
            <option value="">Select nurse</option>{nurses.filter((nurse) => isAssignableNurse(nurse)
              && nurse.employeeCode !== rosters.find((roster) => roster.id === swapForm.rosterId)?.nurseId)
              .map((nurse) => <option key={nurse.employeeCode} value={nurse.employeeCode}>{nurse.name} · {nurse.employeeCode}</option>)}
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

export default function WardManagement({ mode = 'nurses', onOpenWards }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [wards, setWards] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [rosters, setRosters] = useState([]);
  const [nurseRosters, setNurseRosters] = useState([]);
  const [shiftSwaps, setShiftSwaps] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [assignmentBoard, setAssignmentBoard] = useState([]);
  const [unassignedPatients, setUnassignedPatients] = useState([]);
  const [careRecords, setCareRecords] = useState([]);
  const [bedHistory, setBedHistory] = useState({});
  const [bedWaitingList, setBedWaitingList] = useState([]);
  const [dashboard, setDashboard] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeNursingTab, setActiveNursingTab] = useState(mode === 'wards' ? 'wards' : 'assignments');
  const [nurseSearch, setNurseSearch] = useState('');
  const [selectedNurseFilter, setSelectedNurseFilter] = useState('');
  const [selectedWardFilter, setSelectedWardFilter] = useState('');
  const [patientAssignmentFilter, setPatientAssignmentFilter] = useState('all');
  const [patientSearch, setPatientSearch] = useState('');
  const [patientNotes, setPatientNotes] = useState({});
  const [nurseEmployeeIdDraft, setNurseEmployeeIdDraft] = useState({});
  const [creatingNurseProfileId, setCreatingNurseProfileId] = useState('');
  const [wardForm, setWardForm] = useState({ name: '', type: 'GENERAL', maxPatientsPerNurse: 8, minimumNursesPerShift: 1 });
  const [roomForm, setRoomForm] = useState({ id: '', wardId: '', building: '', floor: '', roomNumber: '', acType: 'NON_AC', category: 'GENERAL', bedCapacity: 1, defaultBedType: 'STANDARD', genderRestriction: 'ANY', status: 'ACTIVE', amenities: '', notes: '' });
  const [bulkRoomForm, setBulkRoomForm] = useState({ ...roomForm, roomNumber: '', roomNumberEnd: '' });
  const [bedFilters, setBedFilters] = useState({ wardId: '', status: '', acType: '', floor: '' });
  const [bulkForm, setBulkForm] = useState({ wardId: '', nurseId: '', shift: 'MORNING', bedFrom: '', bedTo: '' });
  const canManage = useMemo(() => (currentUser?.roles || []).some((role) => managerRoles.includes(String(role).replace(/^ROLE_/, '').toUpperCase())), [currentUser]);
  const isNurse = useMemo(() => (currentUser?.roles || []).some((role) => ['NURSE', 'HEAD_NURSE'].includes(String(role).replace(/^ROLE_/, '').toUpperCase())), [currentUser]);
  const canSetupWards = useMemo(() => (currentUser?.roles || []).some((role) => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN'].includes(String(role).replace(/^ROLE_/, '').toUpperCase())), [currentUser]);
  const canManageStaff = canSetupWards || (currentUser?.roles || []).some((role) => ['HEAD_NURSE', 'CRM_EXECUTIVE'].includes(String(role).replace(/^ROLE_/, '').toUpperCase()));
  const canReviewSwaps = useMemo(() => (currentUser?.roles || []).some((role) => ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN', 'HEAD_NURSE'].includes(String(role).replace(/^ROLE_/, '').toUpperCase())), [currentUser]);
  const canCreateNurseProfiles = (currentUser?.roles || []).some((role) => [
    'SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN', 'CRM_EXECUTIVE',
  ].includes(String(role).replace(/^ROLE_/, '').toUpperCase()));
  const nursingTabs = [
    { id: 'assignments', label: 'Patients', icon: UserRoundCheck },
    { id: 'activity', label: 'Activity log', icon: History },
    { id: 'wards', label: 'Wards & beds', icon: BedDouble },
  ];
  const visibleNursingTabs = mode === 'wards'
    ? nursingTabs.filter((tab) => tab.id === 'wards')
    : nursingTabs.filter((tab) => tab.id !== 'wards');
  const activeNurseCount = nurses.filter(isAssignableNurse).length;
  const visibleNurses = useMemo(() => {
    const query = nurseSearch.trim().toLowerCase();
    if (!query) return nurses;
    return nurses.filter((nurse) => [
      nurse.name, nurse.employeeCode, nurse.mobileNo, nurse.emailId,
      nurse.profile?.qualification, nurse.profile?.specialization,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [nurses, nurseSearch]);
  const selectedNurse = nurses.find((nurse) => nurse.employeeCode === selectedNurseFilter || nurse.accountId === selectedNurseFilter);
  const filteredAssignmentBoard = useMemo(() => assignmentBoard.filter((entry) => {
    const patient = entry.patient || {};
    const normalizedPatientSearch = patientSearch.trim().toLowerCase();
    const hasNurse = [entry.primary?.nurseId, entry.backup?.nurseId].some(Boolean);
    const matchesSearch = !normalizedPatientSearch
      || `${patient.patientName || ''} ${patient.patientId || ''}`.toLowerCase().includes(normalizedPatientSearch);
    const matchesNurse = !selectedNurseFilter || [entry.primary?.nurseId, entry.backup?.nurseId]
      .includes(selectedNurseFilter);
    const matchesWard = !selectedWardFilter || patient.patientWardId === selectedWardFilter;
    const matchesAssignment = patientAssignmentFilter === 'all'
      || (patientAssignmentFilter === 'needs-attention' && !entry.primary)
      || (patientAssignmentFilter === 'assigned' && hasNurse);
    return matchesNurse && matchesWard && matchesAssignment && matchesSearch;
  }), [assignmentBoard, selectedNurseFilter, selectedWardFilter, patientAssignmentFilter, patientSearch]);
  const nurseShiftStatus = (nurse) => {
    const today = new Date().toISOString().slice(0, 10);
    const nurseRoster = rosters.find((roster) => (
      [nurse.employeeCode, nurse.accountId, nurse.id].includes(roster.nurseId)
      && roster.status === 'SCHEDULED'
      && roster.startDate <= today
      && roster.endDate >= today
    ));
    return nurseRoster ? `${nurseRoster.shift} · ${nurseRoster.startDate} to ${nurseRoster.endDate}` : 'Not rostered today';
  };
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
        const paths = ['/nursing/wards', '/nursing/rooms', '/nursing/nurses', '/nursing/rosters', '/nursing/assignments', '/nursing/unassigned-patients', '/nursing/shift-swaps', '/nursing/patients/assignments', '/nursing/bed-waiting-list'];
        const results = await Promise.all(paths.map((path) => request(path)));
        [setWards, setRooms, setNurses, setRosters, setAssignments, setUnassignedPatients, setShiftSwaps, setAssignmentBoard, setBedWaitingList]
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

  const createNurseProfile = async (nurse) => {
    if (!nurse.accountId) {
      setError('Link this nurse employee to a nurse account in Users & access before creating the profile.');
      return;
    }
    const employeeId = String(nurse.employeeCode || nurseEmployeeIdDraft[nurse.accountId] || '').trim();
    if (!employeeId) {
      setError('Enter the existing HR nurse employee ID to link this account.');
      return;
    }
    setCreatingNurseProfileId(nurse.employeeCode || nurse.id);
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch(`/nursing/nurses/${encodeURIComponent(nurse.accountId)}/profile`, {
        method: 'PUT',
        body: JSON.stringify({ employeeId, status: 'ACTIVE' }),
      });
      const profile = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(profile.message || profile.detail || profile.title || 'Could not create the nurse profile.');
      }
      setNurses((current) => current.map((entry) => (entry.accountId === nurse.accountId
        ? { ...entry, id: employeeId, employeeCode: employeeId, profile, profileComplete: true,
          employmentActive: true, employmentStatus: 'ACTIVE', accountOnly: false, status: profile.status || 'ACTIVE' }
        : entry)));
      setNurseEmployeeIdDraft((current) => ({ ...current, [nurse.accountId]: '' }));
      setSuccess(`Nurse profile created for ${nurse.name || nurse.employeeCode}.`);
    } catch (requestError) {
      setError(requestError.message || 'Could not create the nurse profile.');
    } finally {
      setCreatingNurseProfileId('');
    }
  };

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!canManage) return undefined;
    const pollBedBoard = async () => {
      try {
        const [updatedWards, waitingList] = await Promise.all([
          request('/nursing/wards'),
          request('/nursing/bed-waiting-list'),
        ]);
        setWards(updatedWards);
        setBedWaitingList(waitingList);
      } catch (requestError) {
        setError(requestError.message || 'Could not refresh the bed board.');
      }
    };
    const timer = window.setInterval(pollBedBoard, 30000);
    return () => window.clearInterval(timer);
  }, [canManage]);

  const submit = async (path, method, body, successMessage) => {
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const result = await request(path, { method, body: JSON.stringify(body) });
      setSuccess(successMessage);
      await refresh();
      return result || true;
    } catch (requestError) {
      setError(requestError.message || 'Request failed.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const openNursingTab = (tab) => {
    if (tab === 'wards' && mode === 'nurses' && onOpenWards) {
      onOpenWards();
      return;
    }
    setActiveNursingTab(tab);
  };

  const createRoom = async (event) => {
    event.preventDefault();
    const amenities = roomForm.amenities.split(',').map((item) => item.trim()).filter(Boolean);
    const { id, ...roomDetails } = roomForm;
    const ok = await submit(id ? `/nursing/rooms/${encodeURIComponent(id)}` : '/nursing/rooms', id ? 'PUT' : 'POST', {
      ...roomDetails, bedCapacity: Number(roomForm.bedCapacity), amenities,
    }, id ? 'Room details updated.' : 'Room and its beds created.');
    if (ok) setRoomForm({ id: '', wardId: '', building: '', floor: '', roomNumber: '', acType: 'NON_AC', category: 'GENERAL', bedCapacity: 1, defaultBedType: 'STANDARD', genderRestriction: 'ANY', status: 'ACTIVE', amenities: '', notes: '' });
  };

  const editRoom = (room) => {
    setRoomForm({
      id: room.id,
      wardId: room.wardId,
      building: room.building || '',
      floor: room.floor || '',
      roomNumber: room.roomNumber || '',
      acType: room.acType || 'NON_AC',
      category: room.category || 'GENERAL',
      bedCapacity: room.bedCapacity || 1,
      defaultBedType: room.defaultBedType || 'STANDARD',
      genderRestriction: room.genderRestriction || 'ANY',
      status: room.status || 'ACTIVE',
      amenities: (room.amenities || []).join(', '),
      notes: room.notes || '',
    });
    document.querySelector('.bed-room-setup')?.setAttribute('open', '');
    window.setTimeout(() => document.querySelector('.bed-room-setup')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    }), 60);
  };

  const reopenRoom = (room) => submit(`/nursing/rooms/${encodeURIComponent(room.id)}`, 'PUT', {
    ...room,
    status: 'ACTIVE',
  }, `Room ${room.roomNumber} is active again.`);

  const openWardSetup = () => {
    document.getElementById('nurse-rules-setup')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    window.setTimeout(() => document.getElementById('ward-name-input')?.focus(), 250);
  };

  const openRoomSetup = () => {
    setRoomForm((current) => ({
      ...current,
      wardId: current.wardId || bedFilters.wardId || wards[0]?.id || '',
    }));
    document.querySelector('.bed-room-setup')?.setAttribute('open', '');
    window.setTimeout(() => document.querySelector('.bed-room-setup')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    }), 60);
  };

  const createRoomRange = async (event) => {
    event.preventDefault();
    const start = Number(bulkRoomForm.roomNumber);
    const end = Number(bulkRoomForm.roomNumberEnd);
    if (!Number.isInteger(start) || !Number.isInteger(end) || end < start || end - start >= 200) {
      setError('Enter a valid room number range with no more than 200 rooms.');
      return;
    }
    const amenities = bulkRoomForm.amenities.split(',').map((item) => item.trim()).filter(Boolean);
    const rooms = Array.from({ length: end - start + 1 }, (_, offset) => ({
      wardId: bulkRoomForm.wardId,
      building: bulkRoomForm.building,
      floor: bulkRoomForm.floor,
      roomNumber: String(start + offset),
      acType: bulkRoomForm.acType,
      category: bulkRoomForm.category,
      bedCapacity: Number(bulkRoomForm.bedCapacity),
      defaultBedType: bulkRoomForm.defaultBedType,
      genderRestriction: bulkRoomForm.genderRestriction,
      amenities,
      notes: bulkRoomForm.notes,
    }));
    await submit('/nursing/rooms/bulk', 'POST', rooms, `${rooms.length} rooms and their beds created.`);
  };

  const updateBedLifecycle = async (event, wardId, bed) => {
    event.preventDefault();
    const form = event.currentTarget;
    const status = form.elements.status.value;
    const reason = form.elements.reason.value.trim();
    const holdUntil = status === 'RESERVED' ? form.elements.holdUntil.value : null;
    if (status === 'RESERVED' && !holdUntil) {
      setError('Choose when this reservation should expire.');
      return;
    }
    await submit(`/nursing/wards/${encodeURIComponent(wardId)}/beds/${encodeURIComponent(bed.id)}`, 'PUT', {
      status, reason, holdUntil: holdUntil ? new Date(holdUntil).toISOString() : null,
    }, `Bed ${bed.bedNumber} updated to ${status.toLowerCase()}.`);
  };

  const completeCleaning = async (bed) => {
    await submit(`/nursing/beds/${encodeURIComponent(bed.id)}/cleaning-complete`, 'POST', {},
      `Bed ${bed.bedNumber} is clean and available.`);
  };

  const cancelWaitlistEntry = async (entry) => {
    await submit(`/nursing/bed-waiting-list/${encodeURIComponent(entry.id)}/cancel`, 'POST', {},
      `Waiting-list request for ${entry.patientName} cancelled.`);
  };

  const loadBedHistory = async (bedId) => {
    if (bedHistory[bedId]) return;
    try {
      const history = await request(`/nursing/beds/${encodeURIComponent(bedId)}/history`);
      setBedHistory((current) => ({ ...current, [bedId]: history }));
    } catch (requestError) {
      setError(requestError.message || 'Could not load bed status history.');
    }
  };

  const submitBulkAssignment = async (event) => {
    event.preventDefault();
    const ok = await submit(`/nursing/wards/${encodeURIComponent(bulkForm.wardId)}/assignments`, 'POST', {
      nurseId: bulkForm.nurseId, role: 'PRIMARY', shift: bulkForm.shift,
      bedFrom: bulkForm.bedFrom || null, bedTo: bulkForm.bedTo || null,
    }, 'Ward patient assignments updated.');
    if (ok) setBulkForm((current) => ({ ...current, bedFrom: '', bedTo: '' }));
  };

  const addPatientNote = async (event, patient) => {
    event.preventDefault();
    const description = patientNotes[patient.patientId]?.trim();
    if (!description) return;
    await submit(`/nursing/patients/${encodeURIComponent(patient.patientId)}/care-records`, 'POST', {
      type: 'NOTE', description, value: '', dueAt: '',
    }, `Note added for ${patient.patientName}.`);
    setPatientNotes((current) => ({ ...current, [patient.patientId]: '' }));
  };

  const completePatientTask = async (patientId, recordId) => {
    await submit(`/nursing/patients/${encodeURIComponent(patientId)}/care-records/${encodeURIComponent(recordId)}/complete`, 'POST', {}, 'Care task marked complete.');
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

  const bedBoard = useMemo(() => wards.flatMap((ward) => (ward.beds || []).map((bed) => ({
    ...bed, wardId: ward.id, wardName: ward.name, room: bed.room || {},
  }))).filter((bed) => (!bedFilters.wardId || bed.wardId === bedFilters.wardId)
    && (!bedFilters.status || bed.status === bedFilters.status)
    && (!bedFilters.acType || !bed.room.acType || bed.room.acType === bedFilters.acType)
    && (!bedFilters.floor || (bed.room.floor || '').toLowerCase().includes(bedFilters.floor.toLowerCase()))), [wards, bedFilters]);
  const bedCounts = useMemo(() => {
    const counts = { total: 0, VACANT: 0, RESERVED: 0, OCCUPIED: 0, CLEANING: 0, MAINTENANCE: 0, BLOCKED: 0 };
    wards.forEach((ward) => (ward.beds || []).forEach((bed) => {
      counts.total += 1;
      counts[bed.status] = (counts[bed.status] || 0) + 1;
    }));
    return counts;
  }, [wards]);
  const wardBedSummaries = useMemo(() => wards.map((ward) => {
    const beds = ward.beds || [];
    return {
      ...ward,
      totalBeds: beds.length,
      vacantBeds: beds.filter((bed) => bed.status === 'VACANT').length,
    };
  }), [wards]);
  const bedBoardRooms = useMemo(() => {
    const groups = new Map();
    bedBoard.forEach((bed) => {
      const room = bed.room || {};
      const roomKey = `${bed.wardId}:${room.id || bed.roomId || room.roomNumber || 'unassigned'}`;
      if (!groups.has(roomKey)) groups.set(roomKey, { id: roomKey, room, wardName: bed.wardName, beds: [] });
      groups.get(roomKey).beds.push(bed);
    });
    return [...groups.values()];
  }, [bedBoard]);

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
    <section className={`workflow-page nurse-management-layout ${mode === 'wards' ? 'ward-management-workspace' : ''}`} aria-labelledby="ward-management-title">
      <header className="workflow-header"><div><h1 id="ward-management-title">{mode === 'wards' ? 'Ward Management' : canManage ? 'Nurse Management' : 'My Nursing Dashboard'}</h1>
        <p>{mode === 'wards'
          ? 'Configure wards, rooms, beds, capacity, staffing ratios, and admission availability.'
          : canManage ? 'Manage admitted patients, nurse assignments, care tasks, and activity.' : 'View assigned patients, shift tasks, care notes, and patient handovers.'}</p></div>
        <div className="workflow-toolbar-actions">
          {canManage && <>
            {mode === 'wards' && canSetupWards && <>
              <button className="workflow-button subtle" type="button" onClick={openWardSetup}><Plus size={15} /> Add ward</button>
              <button className="workflow-button primary" type="button" onClick={openRoomSetup}><Plus size={15} /> Add room</button>
            </>}
            <button className="workflow-button subtle" type="button" onClick={exportReport}><Download size={15} /> Export Excel-compatible CSV</button>
            <button className="workflow-button subtle" type="button" onClick={() => window.print()}>Print / Save as PDF</button>
          </>}
          <button className="workflow-button subtle" type="button" onClick={refresh}><RefreshCw size={15} /> Refresh</button>
        </div>
      </header>
      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}
      {isNurse && !canManage && <NurseDashboard dashboard={dashboard} handovers={handovers} nurses={nurses}
        rosters={nurseRosters} shiftSwaps={shiftSwaps} reviewSwaps={canReviewSwaps}
        refresh={refresh} setError={setError} setSuccess={setSuccess} />}
      {canManage && <div className={mode === 'nurses' ? 'nurse-manager-workspace' : 'ward-manager-content'}>
        {mode === 'nurses' && <aside className="nurse-manager-sidebar" aria-label="Nurse roster">
          <div className="nurse-manager-sidebar-heading"><div><h2>Nurse roster</h2><p>{activeNurseCount} active and assignable</p></div><span>{nurses.length}</span></div>
          <label className="nurse-manager-search"><Search size={15} aria-hidden="true" />
            <input type="search" value={nurseSearch} onChange={(event) => setNurseSearch(event.target.value)} placeholder="Find nurse" aria-label="Find nurse" />
          </label>
          <button type="button" className={`nurse-roster-filter ${!selectedNurseFilter ? 'selected' : ''}`} onClick={() => setSelectedNurseFilter('')}>
            <strong>All nurses</strong><small>{assignmentBoard.length} admitted patients</small>
          </button>
          <div className="nurse-roster-list">
            {visibleNurses.map((nurse) => {
              const identity = nurse.employeeCode || nurse.accountId || nurse.id;
              const isActive = isAssignableNurse(nurse);
              const patientCount = assignmentBoard.filter((entry) => [entry.primary?.nurseId, entry.backup?.nurseId]
                .includes(nurse.employeeCode) || [entry.primary?.nurseId, entry.backup?.nurseId].includes(nurse.accountId)).length;
              return <article key={identity} className={`nurse-roster-card ${selectedNurseFilter === identity ? 'selected' : ''}`}>
                <button type="button" className="nurse-roster-select" aria-pressed={selectedNurseFilter === identity}
                  onClick={() => setSelectedNurseFilter((current) => current === identity ? '' : identity)}>
                  <span className={`nurse-roster-dot ${isActive ? 'active' : ''}`} />
                  <span className="nurse-roster-identity"><strong>{nurse.name || 'Unnamed nurse'}</strong>
                    <small>{[nurse.employeeCode || nurse.id || 'No employee ID', nurse.departmentName].filter(Boolean).join(' · ')}</small></span>
                </button>
                <span className={`nurse-roster-status ${isActive ? 'active' : ''}`}>{isActive ? nurseShiftStatus(nurse)
                  : nurse.accountOnly ? 'HR employee link required' : 'Profile / employment inactive'}</span>
                <small className="nurse-roster-patients">{patientCount} assigned patient{patientCount === 1 ? '' : 's'}</small>
                {!nurse.profileComplete && canCreateNurseProfiles && <div className="nurse-roster-profile-action">
                  {nurse.accountId
                    ? <>
                      {nurse.accountOnly && <input aria-label={`HR employee ID for ${nurse.name}`} value={nurseEmployeeIdDraft[nurse.accountId] || ''}
                        onChange={(event) => setNurseEmployeeIdDraft((current) => ({ ...current, [nurse.accountId]: event.target.value }))}
                        placeholder="Existing HR employee ID" />}
                      <button type="button" disabled={creatingNurseProfileId === identity || (nurse.accountOnly && !nurseEmployeeIdDraft[nurse.accountId]?.trim())} onClick={() => createNurseProfile(nurse)}>
                        {creatingNurseProfileId === identity ? 'Linking profile…' : nurse.accountOnly ? 'Link employee & create profile' : 'Create profile'}
                      </button>
                    </>
                    : <small>Link account first</small>}
                </div>}
              </article>;
            })}
            {!visibleNurses.length && <div className="nurse-roster-empty">No nurse records match this search.</div>}
          </div>
        </aside>}
        <div className={mode === 'nurses' ? 'nurse-manager-main' : ''}>
        {visibleNursingTabs.length > 1 && <nav className="nurse-management-tabs" role="tablist" aria-label={`${mode === 'wards' ? 'Ward' : 'Nurse'} management sections`}>
          {visibleNursingTabs.map(({ id, label, icon: Icon }) => <button
            key={id}
            id={`nurse-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activeNursingTab === id}
            aria-controls={`nurse-panel-${id}`}
            className={activeNursingTab === id ? 'active' : ''}
            onClick={() => openNursingTab(id)}
          ><Icon size={16} />{label}</button>)}
        </nav>}
        {activeNursingTab === 'wards' && <section id="nurse-panel-wards" role="tabpanel" aria-labelledby="nurse-tab-wards">
        <section className="workflow-panel" id="nurse-ward-setup">
          <div className="workflow-panel-heading"><div><h2>Ward and bed setup</h2><p>{canSetupWards
            ? 'Create units, configure patient ratios and minimum shift staffing, then add beds.'
            : 'Review wards assigned to you, manage their beds, and monitor shift staffing.'}</p></div></div>
          {canSetupWards && <>
          <form id="nurse-rules-setup" className="workflow-form-grid" onSubmit={(event) => {
            event.preventDefault();
            submit('/nursing/wards', 'POST', wardForm, 'Ward created. Add vacant beds below.');
            setWardForm({ name: '', type: 'GENERAL', maxPatientsPerNurse: 8, minimumNursesPerShift: 1 });
          }}>
            <label>Ward name<input id="ward-name-input" required value={wardForm.name} onChange={(event) => setWardForm({ ...wardForm, name: event.target.value })} /></label>
            <label>Ward type<select value={wardForm.type} onChange={(event) => setWardForm({ ...wardForm, type: event.target.value })}>
              {['ICU', 'GENERAL', 'PRIVATE', 'PEDIATRICS', 'EMERGENCY', 'OTHER'].map((type) => <option key={type}>{type}</option>)}
            </select></label>
            <label>Maximum patients per nurse<input required type="number" min="1" value={wardForm.maxPatientsPerNurse} onChange={(event) => setWardForm({ ...wardForm, maxPatientsPerNurse: Number(event.target.value) })} /></label>
            <label>Minimum nurses per shift<input required type="number" min="0" value={wardForm.minimumNursesPerShift} onChange={(event) => setWardForm({ ...wardForm, minimumNursesPerShift: Number(event.target.value) })} /></label>
            <button className="workflow-button primary" disabled={busy} type="submit">Create ward</button>
          </form>
          </>}
          {!wards.length ? <div className="workflow-empty">No wards set up yet.</div> : <>
            <div className="bed-management-summary">
              {[
                ['Total beds', bedCounts.total, 'total'],
                ['Occupied', bedCounts.OCCUPIED, 'occupied'],
                ['Vacant', bedCounts.VACANT, 'vacant'],
                ['Reserved', bedCounts.RESERVED, 'reserved'],
                ['Cleaning', bedCounts.CLEANING, 'cleaning'],
                ['Unavailable', bedCounts.MAINTENANCE + bedCounts.BLOCKED, 'maintenance'],
              ].map(([label, count, kind]) => <article key={label} className={`bed-summary-${kind}`}>
                <span>{label}</span><strong>{count}</strong>
              </article>)}
            </div>
            {canSetupWards && <details className="bed-room-setup">
              <summary><DoorOpen size={17} /> {roomForm.id ? `Edit room ${roomForm.roomNumber}` : 'Add room and generate beds'}</summary>
              <form className="workflow-form-grid" onSubmit={createRoom}>
                <label>Ward<select required value={roomForm.wardId} onChange={(event) => setRoomForm({ ...roomForm, wardId: event.target.value })}><option value="">Select ward</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}</select></label>
                <label>Building / block<input value={roomForm.building} onChange={(event) => setRoomForm({ ...roomForm, building: event.target.value })} placeholder="e.g. Main Block" /></label>
                <label>Floor<input value={roomForm.floor} onChange={(event) => setRoomForm({ ...roomForm, floor: event.target.value })} placeholder="e.g. 2" /></label>
                <label>Room number<input required value={roomForm.roomNumber} onChange={(event) => setRoomForm({ ...roomForm, roomNumber: event.target.value })} /></label>
                <label>AC type<select value={roomForm.acType} onChange={(event) => setRoomForm({ ...roomForm, acType: event.target.value })}><option value="AC">AC</option><option value="NON_AC">Non-AC</option></select></label>
                <label>Room category<input required value={roomForm.category} onChange={(event) => setRoomForm({ ...roomForm, category: event.target.value })} placeholder="General, Private, ICU..." /></label>
                <label>Bed capacity<input required type="number" min="1" max="100" value={roomForm.bedCapacity} onChange={(event) => setRoomForm({ ...roomForm, bedCapacity: event.target.value })} /></label>
                <label>Default bed type<select value={roomForm.defaultBedType} onChange={(event) => setRoomForm({ ...roomForm, defaultBedType: event.target.value })}>
                  {['STANDARD', 'ELECTRIC', 'ICU', 'PEDIATRIC_COT', 'BARIATRIC', 'STRETCHER', 'INCUBATOR'].map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
                </select></label>
                <label>Gender restriction<select value={roomForm.genderRestriction} onChange={(event) => setRoomForm({ ...roomForm, genderRestriction: event.target.value })}><option value="ANY">Any</option><option value="MALE">Male</option><option value="FEMALE">Female</option></select></label>
                <label>Room status<select value={roomForm.status} onChange={(event) => setRoomForm({ ...roomForm, status: event.target.value })}><option value="ACTIVE">Active</option><option value="UNDER_MAINTENANCE">Under maintenance</option><option value="CLOSED">Closed</option></select></label>
                <label>Amenities<input value={roomForm.amenities} onChange={(event) => setRoomForm({ ...roomForm, amenities: event.target.value })} placeholder="Oxygen, TV (comma separated)" /></label>
                <label className="workflow-form-wide">Notes<input value={roomForm.notes} onChange={(event) => setRoomForm({ ...roomForm, notes: event.target.value })} /></label>
                <div className="workflow-form-actions workflow-form-wide">
                  <button className="workflow-button primary" type="submit" disabled={busy || !roomForm.wardId}>{roomForm.id ? 'Save room changes' : 'Create room and beds'}</button>
                  {roomForm.id && <button className="workflow-button subtle" type="button" onClick={() => setRoomForm({ id: '', wardId: '', building: '', floor: '', roomNumber: '', acType: 'NON_AC', category: 'GENERAL', bedCapacity: 1, defaultBedType: 'STANDARD', genderRestriction: 'ANY', status: 'ACTIVE', amenities: '', notes: '' })}>Cancel edit</button>}
                </div>
              </form>
              <details className="bed-bulk-create">
                <summary>Create a numeric room range</summary>
                <form className="workflow-form-grid" onSubmit={createRoomRange}>
                  <label>Ward<select required value={bulkRoomForm.wardId} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, wardId: event.target.value })}><option value="">Select ward</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}</select></label>
                  <label>Building / block<input value={bulkRoomForm.building} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, building: event.target.value })} /></label>
                  <label>Floor<input value={bulkRoomForm.floor} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, floor: event.target.value })} /></label>
                  <label>First room number<input required type="number" value={bulkRoomForm.roomNumber} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, roomNumber: event.target.value })} /></label>
                  <label>Last room number<input required type="number" value={bulkRoomForm.roomNumberEnd} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, roomNumberEnd: event.target.value })} /></label>
                  <label>AC type<select value={bulkRoomForm.acType} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, acType: event.target.value })}><option value="AC">AC</option><option value="NON_AC">Non-AC</option></select></label>
                  <label>Category<input required value={bulkRoomForm.category} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, category: event.target.value })} /></label>
                  <label>Beds per room<input required type="number" min="1" max="100" value={bulkRoomForm.bedCapacity} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, bedCapacity: event.target.value })} /></label>
                  <label>Default bed type<select value={bulkRoomForm.defaultBedType} onChange={(event) => setBulkRoomForm({ ...bulkRoomForm, defaultBedType: event.target.value })}>
                    {['STANDARD', 'ELECTRIC', 'ICU', 'PEDIATRIC_COT', 'BARIATRIC', 'STRETCHER', 'INCUBATOR'].map((type) => <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}
                  </select></label>
                  <button className="workflow-button primary" type="submit" disabled={busy || !bulkRoomForm.wardId}>Create room range</button>
                </form>
              </details>
            </details>}
            {canSetupWards && rooms.length > 0 && <section className="workflow-panel room-inventory-panel">
              <div className="workflow-panel-heading"><div><h2>Room inventory</h2><p>{rooms.length} configured rooms across this hospital.</p></div></div>
              <div className="workflow-table-wrap"><table className="workflow-table">
                <thead><tr><th>Room</th><th>Ward / floor</th><th>Category</th><th>AC</th><th>Beds</th><th>Gender</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>{rooms.map((room) => <tr key={room.id}>
                  <td><strong>{room.roomNumber}</strong><small>{room.building || 'Building not set'}</small></td>
                  <td>{wards.find((ward) => ward.id === room.wardId)?.name || room.wardId}<small>{room.floor || 'Floor not set'}</small></td>
                  <td>{room.category}</td><td>{room.acType === 'AC' ? 'AC' : 'Non-AC'}</td>
                  <td>{(wards.find((ward) => ward.id === room.wardId)?.beds || []).filter((bed) => bed.roomId === room.id).length}/{room.bedCapacity}</td>
                  <td>{room.genderRestriction || 'ANY'}</td><td>{String(room.status || 'ACTIVE').replaceAll('_', ' ')}</td>
                  <td><div className="room-inventory-actions">
                    <button className="workflow-button subtle" type="button" onClick={() => editRoom(room)}>Edit room</button>
                    {room.status !== 'ACTIVE' && <button className="workflow-button primary" type="button" disabled={busy} onClick={() => reopenRoom(room)}>Reopen room</button>}
                  </div></td>
                </tr>)}</tbody>
              </table></div>
            </section>}
            <div className="ward-bed-layout">
              <aside className="ward-directory" aria-label="Ward list">
                <div className="ward-directory-heading"><strong>Wards</strong><span>{wards.length}</span></div>
                <button type="button" className={`ward-directory-item ${!bedFilters.wardId ? 'selected' : ''}`} aria-current={!bedFilters.wardId ? 'true' : undefined}
                  onClick={() => setBedFilters({ ...bedFilters, wardId: '' })}>
                  <strong>All wards</strong><small>{bedCounts.total} total beds</small>
                </button>
                {wardBedSummaries.map((ward) => <button key={ward.id} type="button"
                  className={`ward-directory-item ${bedFilters.wardId === ward.id ? 'selected' : ''}`}
                  aria-current={bedFilters.wardId === ward.id ? 'true' : undefined}
                  onClick={() => setBedFilters({ ...bedFilters, wardId: ward.id })}>
                  <strong>{ward.name}</strong><small>{ward.floor || ward.type || 'Ward'} · {ward.vacantBeds} of {ward.totalBeds} beds free</small>
                </button>)}
                {!wards.length && <p className="ward-directory-empty">Create a ward to start adding rooms and beds.</p>}
              </aside>

              <section className="ward-bed-main" aria-label="Live bed board">
            <div className="bed-board-heading">
              <div><h3>{wards.find((ward) => ward.id === bedFilters.wardId)?.name || 'All wards'}</h3><p>Rooms and live bed availability. Select a bed to update its status and history.</p></div>
              <div className="bed-board-filters">
                <select aria-label="Filter beds by status" value={bedFilters.status} onChange={(event) => setBedFilters({ ...bedFilters, status: event.target.value })}>
                  <option value="">All statuses</option>{['VACANT', 'RESERVED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'BLOCKED'].map((status) => <option key={status}>{status}</option>)}
                </select>
                <select aria-label="Filter beds by AC type" value={bedFilters.acType} onChange={(event) => setBedFilters({ ...bedFilters, acType: event.target.value })}>
                  <option value="">AC and Non-AC</option><option value="AC">AC</option><option value="NON_AC">Non-AC</option>
                </select>
                <input aria-label="Filter beds by floor" placeholder="Floor" value={bedFilters.floor} onChange={(event) => setBedFilters({ ...bedFilters, floor: event.target.value })} />
              </div>
            </div>
            <div className="ward-bed-legend" aria-label="Bed status legend">
              <span><i className="vacant" />Available</span><span><i className="occupied" />Occupied</span>
              <span><i className="cleaning" />Cleaning</span><span><i className="maintenance" />Maintenance / blocked</span>
            </div>
            {!bedBoard.length ? <div className="workflow-empty">No beds match these filters.</div> : <div className="ward-room-groups">
              {bedBoardRooms.map((roomGroup) => <section key={roomGroup.id} className="ward-room-group">
                <header className="ward-room-heading">
                  <div><strong>{roomGroup.room.roomNumber ? `Room ${roomGroup.room.roomNumber}` : 'Room not assigned'}</strong>
                    {!bedFilters.wardId && <small>{roomGroup.wardName}</small>}
                  </div>
                  <div className="ward-room-tags">
                    <span>{roomGroup.room.acType === 'AC' ? 'AC' : roomGroup.room.acType === 'NON_AC' ? 'Non-AC' : 'Room'}</span>
                    <small>{roomGroup.beds.filter((bed) => bed.status === 'VACANT').length} free · {roomGroup.beds.length} beds</small>
                  </div>
                </header>
                <div className="live-bed-board">
              {roomGroup.beds.map((bed) => <article key={bed.id} className={`live-bed-tile bed-tile-${String(bed.status).toLowerCase()}`}>
                <div className="live-bed-tile-top">
                  <span className="bed-tile-room">{bed.room.roomNumber || 'Room not assigned'}{bed.room.floor ? ` · Floor ${bed.room.floor}` : ''}</span>
                  <span className={`bed-status-pill bed-status-${String(bed.status).toLowerCase()}`}>{bed.status}</span>
                </div>
                <div className="live-bed-number"><BedDouble size={19} /><strong>{bed.bedNumber}</strong></div>
                <div className="live-bed-meta"><span>{bed.wardName}</span><span>{bed.room.category || bed.bedType || 'Standard'}</span><span>{bed.room.acType === 'AC' ? 'AC' : bed.room.acType === 'NON_AC' ? 'Non-AC' : '—'}</span></div>
                {bed.status === 'OCCUPIED' && <div className="bed-patient-detail"><strong>{bed.patientName || 'Patient admitted'}</strong><small>{bed.patientId}</small></div>}
                {bed.blockReason && <p className="bed-block-reason">{bed.blockReason}</p>}
                {canManageStaff && <details className="bed-history" onToggle={(event) => {
                  if (event.currentTarget.open) loadBedHistory(bed.id);
                }}>
                  <summary>Change history</summary>
                  {!bedHistory[bed.id] ? <small>Loading changes…</small>
                    : !bedHistory[bed.id].length ? <small>No recorded changes.</small>
                      : <ul>{bedHistory[bed.id].map((entry) => <li key={entry.id}>
                        <strong>{entry.fromStatus || 'Created'} → {entry.toStatus}</strong>
                        <small>{entry.changedBy} · {entry.changedAt ? new Date(entry.changedAt).toLocaleString() : ''}</small>
                        {entry.reason && <small>{entry.reason}</small>}
                      </li>)}</ul>}
                </details>}
                {canManageStaff && bed.status === 'CLEANING' && <button className="workflow-button primary bed-clean-button" type="button" disabled={busy} onClick={() => completeCleaning(bed)}><Sparkles size={15} /> Mark clean &amp; vacant</button>}
                {canManageStaff && ['VACANT', 'RESERVED', 'MAINTENANCE', 'BLOCKED'].includes(bed.status) && <form className="bed-lifecycle-form" onSubmit={(event) => updateBedLifecycle(event, bed.wardId, bed)}>
                  <select aria-label={`Change bed ${bed.bedNumber} status`} name="status" defaultValue={bed.status === 'VACANT' ? 'RESERVED' : 'VACANT'}
                    onChange={(event) => {
                      const form = event.currentTarget.form;
                      form.elements.holdUntil.required = event.target.value === 'RESERVED';
                      form.elements.reason.required = ['BLOCKED', 'MAINTENANCE'].includes(event.target.value);
                    }}>
                    {bed.status === 'VACANT' ? <><option value="RESERVED">Reserve</option><option value="MAINTENANCE">Maintenance</option><option value="BLOCKED">Block</option></>
                      : <option value="VACANT">Set vacant</option>}
                  </select>
                  <input name="reason" aria-label={`Reason for bed ${bed.bedNumber} status`} placeholder="Reason (required for block/repair)" />
                  <input name="holdUntil" aria-label={`Reservation expiry for bed ${bed.bedNumber}`} type="datetime-local" />
                  <button className="workflow-button subtle" type="submit" disabled={busy}><Wrench size={14} /> Update</button>
                </form>}
                {canManageStaff && bed.status === 'OCCUPIED' && <small className="bed-action-hint"><Ban size={13} /> Release through patient discharge or transfer.</small>}
              </article>)}
                </div>
              </section>)}
            </div>}
              </section>
            </div>
            {bedWaitingList.length > 0 && <section className="workflow-panel bed-waiting-list-panel">
              <div className="workflow-panel-heading"><div><h3>Admission waiting list</h3><p>Patients awaiting a matching ward bed. Matching availability is refreshed with the bed board.</p></div></div>
              <div className="workflow-table-wrap"><table className="workflow-table">
                <thead><tr><th>Patient</th><th>Preferred ward</th><th>Preference</th><th>Requested</th><th>Availability</th><th>Action</th></tr></thead>
                <tbody>{bedWaitingList.map(({ entry, matchingBedsAvailable }) => <tr key={entry.id}>
                  <td><strong>{entry.patientName}</strong><small>{entry.patientId}</small></td>
                  <td>{wards.find((ward) => ward.id === entry.wardId)?.name || entry.wardId}</td>
                  <td>{[entry.preferredCategory, entry.preferredAcType === 'AC' ? 'AC' : entry.preferredAcType === 'NON_AC' ? 'Non-AC' : 'Any AC'].filter(Boolean).join(' · ')}</td>
                  <td>{entry.requestedAt ? new Date(entry.requestedAt).toLocaleString() : '—'}</td>
                  <td><span className={`workflow-status ${matchingBedsAvailable ? 'ready' : 'warning'}`}>{matchingBedsAvailable ? 'Matching bed available' : 'Waiting'}</span></td>
                  <td><button className="workflow-button subtle" type="button" disabled={busy} onClick={() => cancelWaitlistEntry(entry)}>Cancel</button></td>
                </tr>)}</tbody>
              </table></div>
            </section>}
          </>}
        </section>
        </section>}

        {activeNursingTab === 'assignments' && <section id="nurse-panel-assignments" role="tabpanel" aria-labelledby="nurse-tab-assignments">
          <section className="workflow-panel nurse-patients-panel">
            <div className="nurse-patient-toolbar">
              <div><h2>{selectedNurse ? `${selectedNurse.name}'s patients` : 'Admitted patients'}</h2>
                <p>{filteredAssignmentBoard.length} of {assignmentBoard.length} admitted patients</p></div>
              <label className="nurse-patient-search"><Search size={15} aria-hidden="true" />
                <input type="search" value={patientSearch} onChange={(event) => setPatientSearch(event.target.value)} placeholder="Find patient or ID" aria-label="Find patient by name or ID" />
              </label>
              <select aria-label="Filter patients by ward" value={selectedWardFilter} onChange={(event) => setSelectedWardFilter(event.target.value)}>
                <option value="">All wards</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}
              </select>
              <select aria-label="Filter patient assignments" value={patientAssignmentFilter} onChange={(event) => setPatientAssignmentFilter(event.target.value)}>
                <option value="all">All patients</option><option value="assigned">Assigned</option><option value="needs-attention">Needs a nurse</option>
              </select>
              {selectedNurse && <button type="button" className="workflow-button subtle" onClick={() => setSelectedNurseFilter('')}>Clear nurse</button>}
            </div>

            <details className="nurse-bulk-assignment">
              <summary>Assign patients by ward and shift</summary>
              <form className="workflow-form-grid" onSubmit={submitBulkAssignment}>
                <label>Ward<select required value={bulkForm.wardId} onChange={(event) => setBulkForm({ ...bulkForm, wardId: event.target.value })}><option value="">Select ward</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}</select></label>
                <label>Nurse<select required value={bulkForm.nurseId} onChange={(event) => setBulkForm({ ...bulkForm, nurseId: event.target.value })}><option value="">Select nurse</option>{nurses.filter(isAssignableNurse).map((nurse) => <option key={nurse.employeeCode} value={nurse.employeeCode}>{nurse.name} · {nurse.employeeCode}</option>)}</select></label>
                <label>Shift<select value={bulkForm.shift} onChange={(event) => setBulkForm({ ...bulkForm, shift: event.target.value })}><option value="MORNING">Morning</option><option value="EVENING">Evening</option><option value="NIGHT">Night</option></select></label>
                <label>Bed from<input value={bulkForm.bedFrom} onChange={(event) => setBulkForm({ ...bulkForm, bedFrom: event.target.value })} placeholder="Optional" /></label>
                <label>Bed to<input value={bulkForm.bedTo} onChange={(event) => setBulkForm({ ...bulkForm, bedTo: event.target.value })} placeholder="Optional" /></label>
                <button className="workflow-button primary" type="submit" disabled={busy || !bulkForm.wardId || !bulkForm.nurseId}>Assign ward patients</button>
              </form>
            </details>

            {!filteredAssignmentBoard.length ? <div className="workflow-empty">{assignmentBoard.length
              ? 'No admitted patients match these filters.'
              : 'No admitted patients are in a ward yet. Admitted patient records will appear here, including patients awaiting a nurse.'}</div>
              : <div className="nurse-patient-cards">{filteredAssignmentBoard.map((entry) => {
                const patient = entry.patient || {};
                const patientId = patient.patientId || entry.primary?.patientId || entry.backup?.patientId;
                const patientTasks = careRecords.filter((record) => record.patientId === patientId);
                const pendingTasks = patientTasks.filter((record) => record.status === 'PENDING');
                const completedTasks = patientTasks.filter((record) => record.status === 'COMPLETED').length;
                const needsAttention = !entry.primary;
                const currentWard = wards.find((ward) => ward.id === patient.patientWardId);
                const currentBed = currentWard?.beds?.find((bed) => bed.id === patient.patientBedId);
                const availableBeds = wards.flatMap((ward) => (ward.beds || [])
                  .filter((bed) => bed.status === 'VACANT' && bed.id !== patient.patientBedId
                    && (!bed.room?.status || bed.room.status === 'ACTIVE'))
                  .map((bed) => ({ ...bed, wardId: ward.id, wardName: ward.name })));
                return <article key={patientId} className={`nurse-patient-card ${needsAttention ? 'needs-nurse' : ''}`}>
                  <header className="nurse-patient-card-heading">
                    <div><h3>{patient.patientName || 'Patient'}</h3><p>{patientId} · {patient.patientAge ? `Age ${patient.patientAge}` : 'Age not recorded'}{patient.gender ? ` · ${patient.gender}` : ''}</p></div>
                    <span className="nurse-patient-progress">{completedTasks} of {patientTasks.length} tasks done</span>
                  </header>
                  {needsAttention && <span className="nurse-patient-flag">No nurse assigned</span>}
                  <p className="nurse-patient-location"><strong>{currentWard?.name || patient.patientWardnum || 'Ward not recorded'}</strong>
                    <span>{currentBed?.room?.roomNumber ? `Room ${currentBed.room.roomNumber} · ` : ''}{currentBed?.bedNumber || patient.patientBedId || 'Bed not recorded'}</span></p>
                  <div className="nurse-patient-assignees">
                    <label>Primary nurse<select aria-label={`Primary nurse for ${patient.patientName}`} value={entry.primary?.nurseId || ''} onChange={(event) => {
                      if (!event.target.value) return;
                      void submit(`/nursing/patients/${encodeURIComponent(patientId)}/assignments`, 'POST', { nurseId: event.target.value, role: 'PRIMARY', shift: null }, `${patient.patientName} assigned as primary nurse.`);
                    }}><option value="">Assign primary</option>{nurses.filter(isAssignableNurse).map((nurse) => <option key={nurse.employeeCode} value={nurse.employeeCode}>{nurse.name} · {nurse.employeeCode}</option>)}</select></label>
                    <label>Backup nurse<select aria-label={`Backup nurse for ${patient.patientName}`} value={entry.backup?.nurseId || ''} onChange={(event) => {
                      if (!event.target.value) return;
                      void submit(`/nursing/patients/${encodeURIComponent(patientId)}/assignments`, 'POST', { nurseId: event.target.value, role: 'BACKUP', shift: null }, `${patient.patientName} assigned as backup nurse.`);
                    }}><option value="">Assign backup</option>{nurses.filter((nurse) => isAssignableNurse(nurse) && nurse.employeeCode !== entry.primary?.nurseId).map((nurse) => <option key={nurse.employeeCode} value={nurse.employeeCode}>{nurse.name} · {nurse.employeeCode}</option>)}</select></label>
                  </div>
                  <p className="nurse-patient-clinical"><strong>Diagnosis:</strong> {patient.patientPrescription || 'Not recorded'}<br /><strong>Allergies:</strong> {patient.patientAllergies || 'None recorded'}</p>
                  <section className="nurse-patient-tasks" aria-label={`Care tasks for ${patient.patientName}`}>
                    <div className="nurse-patient-subheading"><strong>Care tasks</strong><span>{pendingTasks.length} pending</span></div>
                    {patientTasks.length ? <ul>{patientTasks.map((task) => <li key={task.id} className={task.status === 'COMPLETED' ? 'completed' : ''}>
                      <input type="checkbox" checked={task.status === 'COMPLETED'} disabled={task.status === 'COMPLETED' || busy} onChange={() => completePatientTask(patientId, task.id)} aria-label={`Complete ${task.description || task.type} for ${patient.patientName}`} />
                      <span>{task.description || task.value || task.type}{isOverdue(task) && <em>Overdue</em>}</span>
                    </li>)}</ul> : <p className="nurse-patient-no-tasks">No care tasks recorded.</p>}
                  </section>
                  <form className="nurse-patient-note" onSubmit={(event) => addPatientNote(event, patient)}>
                    <input value={patientNotes[patientId] || ''} onChange={(event) => setPatientNotes((current) => ({ ...current, [patientId]: event.target.value }))} aria-label={`Add a note for ${patient.patientName}`} placeholder="Add a care note" />
                    <button className="workflow-button subtle" type="submit" disabled={busy || !patientNotes[patientId]?.trim()}>Add note</button>
                  </form>
                  <details className="nurse-patient-transfer"><summary>Transfer patient</summary>
                    <form className="nursing-inline-form" onSubmit={(event) => transferPatient(event, patient)}>
                      <select required name="targetBed" defaultValue=""><option value="">Select vacant bed</option>{availableBeds.map((bed) => <option key={bed.id} value={`${bed.wardId}::${bed.id}`}>{bed.wardName} · {bed.room?.roomNumber ? `Room ${bed.room.roomNumber} · ` : ''}{bed.bedNumber}</option>)}</select>
                      <button className="workflow-button subtle" type="submit" disabled={busy || !availableBeds.length}>Transfer</button>
                    </form>
                  </details>
                </article>;
              })}</div>}
            {unassignedPatients.length > 0 && <p className="workflow-alert error">{unassignedPatients.length} admitted patient(s) need a primary nurse.</p>}
          </section>
        </section>}

        {activeNursingTab === 'activity' && <section id="nurse-panel-activity" role="tabpanel" aria-labelledby="nurse-tab-activity"><section className="workflow-panel">
          <div className="workflow-panel-heading"><div><h2>Assignment history &amp; outstanding care</h2><p>Audit of primary/backup assignments, handovers, and missed or overdue tasks.</p></div></div>
          <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Patient</th><th>Nurse</th><th>Role</th><th>Ward / shift</th><th>Assigned by</th><th>From / to</th><th>Status</th></tr></thead>
            <tbody>{assignments.filter((assignment) => !selectedNurseFilter || assignment.nurseId === selectedNurseFilter).map((assignment) => <tr key={assignment.id}><td>{assignment.patientId}</td><td>{nurseByIdentity(nurses, assignment.nurseId)?.name || assignment.nurseId}</td><td>{assignment.role}</td><td>{wards.find((ward) => ward.id === assignment.wardId)?.name || assignment.wardId}<small>{assignment.shift}</small></td><td>{assignment.assignedBy}</td><td>{assignment.fromTime}<small>{assignment.toTime || 'Current'}</small></td><td>{assignment.status}</td></tr>)}</tbody>
          </table></div>
          <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Patient</th><th>Nurse</th><th>Task</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>{careRecords.filter((record) => record.status === 'PENDING' && (!selectedNurseFilter || record.nurseId === selectedNurseFilter)).map((record) => <tr key={record.id}><td>{record.patientId}</td><td>{nurseByIdentity(nurses, record.nurseId)?.name || record.nurseId}</td><td>{record.description || record.type}</td><td>{record.dueAt || 'Not specified'}</td><td>{isOverdue(record) ? 'OVERDUE' : 'PENDING'}</td></tr>)}</tbody>
          </table></div>
        </section></section>}
        </div>
      </div>}
    </section>
  );
}
