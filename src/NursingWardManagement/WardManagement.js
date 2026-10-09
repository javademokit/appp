import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, BedDouble, Ban, ClipboardList, DoorOpen, Download, Filter, History, RefreshCw, Sparkles, Users, UserRoundCheck, Wrench } from 'lucide-react';
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

export default function WardManagement() {
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
  const [activeNursingTab, setActiveNursingTab] = useState('overview');
  const [activeSetupStep, setActiveSetupStep] = useState('basics');
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
  const nursingTabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'wards', label: 'Wards & beds', icon: BedDouble },
    { id: 'assignments', label: 'Patient assignments', icon: UserRoundCheck },
    { id: 'activity', label: 'History & care', icon: History },
  ];
  const activeNurseCount = nurses.filter(isAssignableNurse).length;
  const rulesConfigured = wards.length > 0 && wards.every((ward) => Number(ward.maxPatientsPerNurse) > 0
    && Number(ward.minimumNursesPerShift) >= 0);
  const nursingSetupReady = wards.length > 0 && activeNurseCount > 0 && rulesConfigured;
  const setupSteps = [
    { id: 'basics', label: 'Basics', detail: 'Review the nursing setup', complete: true, tab: 'overview', anchor: 'nurse-go-live' },
    { id: 'wards', label: 'Wards', detail: 'Create wards and beds', complete: wards.length > 0, tab: 'wards', anchor: 'nurse-ward-setup' },
    { id: 'rules', label: 'Rules', detail: 'Set staffing and patient ratios', complete: rulesConfigured, tab: 'wards', anchor: 'nurse-rules-setup' },
    { id: 'go-live', label: 'Go live', detail: 'Confirm readiness', complete: nursingSetupReady, tab: 'overview', anchor: 'nurse-go-live' },
  ];

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

  const openSetupStep = (step) => {
    setActiveSetupStep(step.id);
    setActiveNursingTab(step.tab);
    window.setTimeout(() => document.getElementById(step.anchor)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    }), 60);
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
    <section className="workflow-page nurse-management-layout" aria-labelledby="ward-management-title">
      <header className="workflow-header"><div><h1 id="ward-management-title">{canManage ? 'Nurse Management' : 'My Nursing Dashboard'}</h1>
        <p>{canManage ? 'Manage nurse profiles, ward beds and shifts, assign patients, and monitor workload and handovers.' : 'View assigned patients, shift tasks, care notes, and patient handovers.'}</p></div>
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
      {isNurse && !canManage && <NurseDashboard dashboard={dashboard} handovers={handovers} nurses={nurses}
        rosters={nurseRosters} shiftSwaps={shiftSwaps} reviewSwaps={canReviewSwaps}
        refresh={refresh} setError={setError} setSuccess={setSuccess} />}
      {canManage && <>
        <section className="nurse-setup-flow" aria-label="Guided nursing setup">
          <div className="nurse-setup-flow-heading">
            <div><span>GETTING STARTED</span><h2>Set up your nursing workflow</h2>
              <p>Complete the prerequisites in order: wards, active nurse profiles, and staffing rules. Schedule shifts from Staff &amp; Shifts.</p></div>
            <span className={`nurse-setup-readiness ${nursingSetupReady ? 'ready' : ''}`}>
              {nursingSetupReady ? 'Ready to go live' : 'Setup in progress'}
            </span>
          </div>
          <ol className="nurse-setup-steps">
            {setupSteps.map((step, index) => <li key={step.id}>
              <button type="button"
                className={`${activeSetupStep === step.id ? 'active' : ''} ${step.complete ? 'complete' : ''}`}
                aria-current={activeSetupStep === step.id ? 'step' : undefined}
                onClick={() => openSetupStep(step)}>
                <span className="nurse-setup-step-number">{step.complete ? <UserRoundCheck size={15} /> : index + 1}</span>
                <span className="nurse-setup-step-copy"><strong>{step.label}</strong><small>{step.detail}</small></span>
                <span className="nurse-setup-step-status">{step.complete ? 'Ready' : 'To do'}</span>
              </button>
            </li>)}
          </ol>
        </section>
        <nav className="nurse-management-tabs" role="tablist" aria-label="Nurse management sections">
          {nursingTabs.map(({ id, label, icon: Icon }) => <button
            key={id}
            id={`nurse-tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activeNursingTab === id}
            aria-controls={`nurse-panel-${id}`}
            className={activeNursingTab === id ? 'active' : ''}
            onClick={() => setActiveNursingTab(id)}
          ><Icon size={16} />{label}</button>)}
        </nav>
        {activeNursingTab === 'overview' && <section className="nurse-overview" id="nurse-panel-overview" role="tabpanel" aria-labelledby="nurse-tab-overview">
          <div className="nurse-overview-intro">
            <div id="nurse-go-live"><span>WARD OPERATIONS</span><h2>Good care starts with clear assignments.</h2>
              <p>Monitor ward capacity, nurse coverage, and patients who need an assignment.</p></div>
            <button className="workflow-button primary" type="button" onClick={() => setActiveNursingTab('assignments')}>
              <UserRoundCheck size={16} /> Manage patient assignments
            </button>
          </div>
          <section className={`nurse-go-live-card ${nursingSetupReady ? 'ready' : ''}`}>
            <div><span>{nursingSetupReady ? 'SETUP COMPLETE' : 'SETUP CHECKLIST'}</span>
              <h3>{nursingSetupReady ? 'Your nursing workflow is ready.' : 'Finish the prerequisites before patient assignments.'}</h3>
              <p>{wards.length} wards · {activeNurseCount} active nurses. Manage nurse shifts from Staff &amp; Shifts.</p></div>
            <button className="workflow-button subtle" type="button"
              onClick={() => nursingSetupReady ? setActiveNursingTab('assignments') : openSetupStep(setupSteps.find((step) => !step.complete && step.id !== 'basics') || setupSteps[setupSteps.length - 1])}>
              {nursingSetupReady ? 'Open assignments' : 'Continue setup'}
            </button>
          </section>
          <div className="nurse-overview-metrics">
            <article><span>Active wards</span><strong>{wards.length}</strong><small>{wards.reduce((total, ward) => total + (Number(ward.vacantBeds) || 0), 0)} vacant beds</small><BedDouble size={20} /></article>
            <article><span>Active nurses</span><strong>{activeNurseCount}</strong><small>Employed and scheduled staff</small><Users size={20} /></article>
            <article><span>Admitted patients</span><strong>{assignmentBoard.length}</strong><small>Across configured wards</small><UserRoundCheck size={20} /></article>
            <article className={unassignedPatients.length ? 'needs-attention' : ''}><span>Need a nurse</span><strong>{unassignedPatients.length}</strong><small>{unassignedPatients.length ? 'Review assignments' : 'All patients covered'}</small><ClipboardList size={20} /></article>
          </div>
          <div className="nurse-overview-bottom">
            <section className="workflow-panel">
              <div className="workflow-panel-heading"><div><h2>Ward coverage</h2><p>Current staffing against each ward’s minimum.</p></div>
                <button className="workflow-button subtle" type="button" onClick={() => setActiveNursingTab('wards')}>View wards</button></div>
              {!wards.length ? <div className="workflow-empty">No wards are configured yet.</div> : <div className="nurse-ward-summary">
                {wards.slice(0, 5).map((ward) => <div key={ward.id}>
                  <span className="nurse-ward-mark"><BedDouble size={17} /></span>
                  <div><strong>{ward.name}</strong><small>{ward.type} · {ward.vacantBeds} vacant beds</small></div>
                  <span className={`nurse-coverage-status ${ward.understaffed ? 'warning' : 'ready'}`}>{ward.nursesOnDuty}/{ward.minimumNursesPerShift} on duty</span>
                </div>)}
              </div>}
            </section>
            <section className="workflow-panel nurse-attention-panel">
              <div className="workflow-panel-heading"><div><h2>Needs attention</h2><p>Items that may need an administrator’s review.</p></div></div>
              {wards.some((ward) => ward.understaffed) && <button type="button" onClick={() => setActiveNursingTab('wards')}>
                <span className="nurse-attention-dot" />{wards.filter((ward) => ward.understaffed).length} ward(s) below minimum staffing
              </button>}
              {unassignedPatients.length > 0 && <button type="button" onClick={() => setActiveNursingTab('assignments')}>
                <span className="nurse-attention-dot" />{unassignedPatients.length} patient(s) without a primary nurse
              </button>}
              {bedWaitingList.filter((item) => item.matchingBedsAvailable).length > 0 && <button type="button" onClick={() => setActiveNursingTab('wards')}>
                <span className="nurse-attention-dot" />{bedWaitingList.filter((item) => item.matchingBedsAvailable).length} waiting patient(s) have a matching bed available
              </button>}
              {!wards.some((ward) => ward.understaffed) && !unassignedPatients.length && !bedWaitingList.some((item) => item.matchingBedsAvailable)
                && <div className="nurse-all-clear"><Activity size={17} />No urgent staffing or assignment issues.</div>}
            </section>
          </div>
        </section>
        }
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
            <label>Ward name<input required value={wardForm.name} onChange={(event) => setWardForm({ ...wardForm, name: event.target.value })} /></label>
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
                  <td>{room.genderRestriction || 'ANY'}</td><td>{room.status}</td>
                  <td><button className="workflow-button subtle" type="button" onClick={() => editRoom(room)}>Edit room</button></td>
                </tr>)}</tbody>
              </table></div>
            </section>}
            <div className="bed-board-heading">
              <div><h3>Live bed board</h3><p>Bed status changes update availability for admissions and transfers.</p></div>
              <div className="bed-board-filters">
                <label><Filter size={14} /><select aria-label="Filter beds by ward" value={bedFilters.wardId} onChange={(event) => setBedFilters({ ...bedFilters, wardId: event.target.value })}>
                  <option value="">All wards</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}
                </select></label>
                <select aria-label="Filter beds by status" value={bedFilters.status} onChange={(event) => setBedFilters({ ...bedFilters, status: event.target.value })}>
                  <option value="">All statuses</option>{['VACANT', 'RESERVED', 'OCCUPIED', 'CLEANING', 'MAINTENANCE', 'BLOCKED'].map((status) => <option key={status}>{status}</option>)}
                </select>
                <select aria-label="Filter beds by AC type" value={bedFilters.acType} onChange={(event) => setBedFilters({ ...bedFilters, acType: event.target.value })}>
                  <option value="">AC and Non-AC</option><option value="AC">AC</option><option value="NON_AC">Non-AC</option>
                </select>
                <input aria-label="Filter beds by floor" placeholder="Floor" value={bedFilters.floor} onChange={(event) => setBedFilters({ ...bedFilters, floor: event.target.value })} />
              </div>
            </div>
            {!bedBoard.length ? <div className="workflow-empty">No beds match these filters.</div> : <div className="live-bed-board">
              {bedBoard.map((bed) => <article key={bed.id} className={`live-bed-tile bed-tile-${String(bed.status).toLowerCase()}`}>
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
            </div>}
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

        {activeNursingTab === 'assignments' && <section id="nurse-panel-assignments" role="tabpanel" aria-labelledby="nurse-tab-assignments"><section className="workflow-panel">
          <div className="workflow-panel-heading"><div><h2>Patient assignment</h2><p>Assign ward coverage, and maintain primary and backup nurse assignments per admitted patient.</p></div></div>
          <form className="workflow-form-grid" onSubmit={submitBulkAssignment}>
            <label>Ward<select required value={bulkForm.wardId} onChange={(event) => setBulkForm({ ...bulkForm, wardId: event.target.value })}><option value="">Select ward</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name}</option>)}</select></label>
            <label>Nurse<select required value={bulkForm.nurseId} onChange={(event) => setBulkForm({ ...bulkForm, nurseId: event.target.value })}><option value="">Select nurse</option>{nurses.filter(isAssignableNurse).map((nurse) => <option key={nurse.employeeCode} value={nurse.employeeCode}>{nurse.name} · {nurse.employeeCode}</option>)}</select></label>
            <label>Shift<select value={bulkForm.shift} onChange={(event) => setBulkForm({ ...bulkForm, shift: event.target.value })}><option value="MORNING">Morning</option><option value="EVENING">Evening</option><option value="NIGHT">Night</option></select></label>
            <label>Bed from<input value={bulkForm.bedFrom} onChange={(event) => setBulkForm({ ...bulkForm, bedFrom: event.target.value })} placeholder="Optional" /></label>
            <label>Bed to<input value={bulkForm.bedTo} onChange={(event) => setBulkForm({ ...bulkForm, bedTo: event.target.value })} placeholder="Optional" /></label>
            <button className="workflow-button primary" type="submit" disabled={busy || !bulkForm.wardId || !bulkForm.nurseId}>Assign ward patients</button>
          </form>
          {!assignmentBoard.length ? <div className="workflow-empty">No admitted patients are in a ward.</div> : <div className="workflow-table-wrap"><table className="workflow-table">
            <thead><tr><th>Patient</th><th>Ward / bed</th><th>Primary nurse</th><th>Backup nurse</th><th>Assign / reassign</th><th>Transfer</th></tr></thead>
            <tbody>{assignmentBoard.map((entry) => {
              const patient = entry.patient;
              const primaryNurse = nurseByIdentity(nurses, entry.primary?.nurseId);
              const backupNurse = nurseByIdentity(nurses, entry.backup?.nurseId);
              const availableBeds = wards.flatMap((ward) => (ward.beds || [])
                .filter((bed) => bed.status === 'VACANT' && bed.id !== patient.patientBedId
                  && (!bed.room?.status || bed.room.status === 'ACTIVE'))
                .map((bed) => ({ ...bed, wardId: ward.id, wardName: ward.name })));
              return <tr key={patient.patientId}><td>{patient.patientName}<small>{patient.patientId}</small></td>
                <td>{patient.patientWardnum}<small>{(() => {
                  const currentBed = wards.find((ward) => ward.id === patient.patientWardId)?.beds?.find((bed) => bed.id === patient.patientBedId);
                  return [currentBed?.room?.roomNumber && `Room ${currentBed.room.roomNumber}`, currentBed?.bedNumber || patient.patientBedId].filter(Boolean).join(' · ');
                })()}</small></td>
                <td>{primaryNurse?.name || (entry.primary ? entry.primary.nurseId : 'Unassigned')}
                  {primaryNurse?.employeeCode && <small>{primaryNurse.employeeCode}</small>}</td>
                <td>{backupNurse?.name || (entry.backup ? entry.backup.nurseId : 'Not assigned')}
                  {backupNurse?.employeeCode && <small>{backupNurse.employeeCode}</small>}</td>
                <td><form className="nursing-inline-form" onSubmit={(event) => assignUnassigned(event, patient)}>
                  <select required name="role" defaultValue="PRIMARY"><option value="PRIMARY">Primary</option><option value="BACKUP">Backup</option></select>
                  <select required name="nurseId" defaultValue=""><option value="">Select nurse</option>{nurses.filter(isAssignableNurse).map((nurse) => <option key={nurse.employeeCode} value={nurse.employeeCode}>{nurse.name} · {nurse.employeeCode}</option>)}</select>
                  <button className="workflow-button primary" disabled={busy}>Assign</button>
                </form></td>
                <td><form className="nursing-inline-form" onSubmit={(event) => transferPatient(event, patient)}>
                  <select required name="targetBed" defaultValue=""><option value="">Select vacant bed</option>{availableBeds.map((bed) => (
                    <option key={bed.id} value={`${bed.wardId}::${bed.id}`}>{bed.wardName} · {bed.room?.roomNumber ? `Room ${bed.room.roomNumber} · ` : ''}{bed.bedNumber}</option>
                  ))}</select>
                  <button className="workflow-button subtle" type="submit" disabled={busy || !availableBeds.length}>Transfer</button>
                </form></td></tr>;
            })}</tbody>
          </table></div>}
          {unassignedPatients.length > 0 && <p className="workflow-alert error">{unassignedPatients.length} admitted patient(s) have no primary nurse.</p>}
        </section></section>}

        {activeNursingTab === 'activity' && <section id="nurse-panel-activity" role="tabpanel" aria-labelledby="nurse-tab-activity"><section className="workflow-panel">
          <div className="workflow-panel-heading"><div><h2>Assignment history &amp; outstanding care</h2><p>Audit of primary/backup assignments, handovers, and missed or overdue tasks.</p></div></div>
          <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Patient</th><th>Nurse</th><th>Role</th><th>Ward / shift</th><th>Assigned by</th><th>From / to</th><th>Status</th></tr></thead>
            <tbody>{assignments.map((assignment) => <tr key={assignment.id}><td>{assignment.patientId}</td><td>{nurseByIdentity(nurses, assignment.nurseId)?.name || assignment.nurseId}</td><td>{assignment.role}</td><td>{wards.find((ward) => ward.id === assignment.wardId)?.name || assignment.wardId}<small>{assignment.shift}</small></td><td>{assignment.assignedBy}</td><td>{assignment.fromTime}<small>{assignment.toTime || 'Current'}</small></td><td>{assignment.status}</td></tr>)}</tbody>
          </table></div>
          <div className="workflow-table-wrap"><table className="workflow-table"><thead><tr><th>Patient</th><th>Nurse</th><th>Task</th><th>Due</th><th>Status</th></tr></thead>
            <tbody>{careRecords.filter((record) => record.status === 'PENDING').map((record) => <tr key={record.id}><td>{record.patientId}</td><td>{nurseByIdentity(nurses, record.nurseId)?.name || record.nurseId}</td><td>{record.description || record.type}</td><td>{record.dueAt || 'Not specified'}</td><td>{isOverdue(record) ? 'OVERDUE' : 'PENDING'}</td></tr>)}</tbody>
          </table></div>
        </section></section>}
      </>}
    </section>
  );
}
