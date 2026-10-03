import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, UserRound } from 'lucide-react';
import { apiFetch } from '../API/api';
import '../Operations/Operations.css';
import './Patients.css';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [nurses, setNurses] = useState([]);
  const [wards, setWards] = useState([]);
  const [nurseSelections, setNurseSelections] = useState({});
  const [canAssignNurse, setCanAssignNurse] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [assigningPatientId, setAssigningPatientId] = useState('');
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({ patientId: '', wardId: '', bedId: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [patientResponse, nurseResponse, wardResponse, userResponse] = await Promise.all([
        apiFetch('/patients'),
        apiFetch('/nursing/nurses'),
        apiFetch('/nursing/wards'),
        apiFetch('/users/me'),
      ]);
      const [patientData, nurseData, wardData, userData] = await Promise.all([
        patientResponse.json().catch(() => ({})),
        nurseResponse.json().catch(() => ({})),
        wardResponse.json().catch(() => ({})),
        userResponse.json().catch(() => ({})),
      ]);
      if (!patientResponse.ok) throw new Error(patientData.message || patientData.detail || 'Could not load patient records');
      if (!nurseResponse.ok) throw new Error(nurseData.message || nurseData.detail || 'Could not load active nurses');
      if (!wardResponse.ok) throw new Error(wardData.message || wardData.detail || 'Could not load configured wards');
      if (!userResponse.ok) throw new Error(userData.message || userData.detail || 'Could not load current user permissions');
      if (!Array.isArray(patientData) || !Array.isArray(nurseData) || !Array.isArray(wardData) || !Array.isArray(userData.roles)) {
        throw new Error('Patient, nurse, ward, or user service returned an invalid response');
      }
      setPatients(patientData);
      setNurses(nurseData.filter((nurse) => nurse.profileComplete && nurse.status === 'ACTIVE'));
      setWards(wardData);
      setCanAssignNurse(userData.roles.some((role) => (
        ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN', 'CRM_EXECUTIVE'].includes(
          String(role).trim().toUpperCase().replace(/^ROLE_/, ''),
        )
      )));
      setNurseSelections(Object.fromEntries(
        patientData.map((patient) => [patient.patientId, patient.patientNurseId || '']),
      ));
    } catch (requestError) {
      setError(requestError.message || 'Could not load patient records');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const submitAdmission = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch(`/patients/${encodeURIComponent(admissionForm.patientId)}/admission`, {
        method: 'POST',
        body: JSON.stringify({ wardId: admissionForm.wardId, bedId: admissionForm.bedId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not admit patient');
      setAdmissionForm({ patientId: '', wardId: '', bedId: '' });
      setShowAdmissionForm(false);
      setSuccess(data.patientNurseId
        ? `${data.patientName} admitted under Patient ID ${data.patientId} and assigned to ${data.patientNurseassign}.`
        : `${data.patientName} admitted under Patient ID ${data.patientId}, but no nurse is on duty with capacity. Assign a nurse from Nursing & Ward Management.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not admit patient');
    } finally {
      setBusy(false);
    }
  };

  const assignNurse = async (patient) => {
    const nurseId = nurseSelections[patient.patientId] || '';
    if (!nurseId) {
      setError('Select a nurse before assigning them to this patient.');
      return;
    }
    setAssigningPatientId(patient.patientId);
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch(`/nursing/patients/${encodeURIComponent(patient.patientId)}/nurse`, {
        method: 'PUT',
        body: JSON.stringify({ nurseId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.detail || data.title
          || `Could not assign nurse (${response.status})`);
      }
      setPatients((current) => current.map((entry) => (
        entry.patientId === data.patientId ? data : entry
      )));
      setNurseSelections((current) => ({ ...current, [data.patientId]: data.patientNurseId }));
      setSuccess(`${data.patientNurseassign} assigned to ${data.patientName} (${data.patientId}).`);
    } catch (requestError) {
      setError(requestError.message || 'Could not assign nurse');
    } finally {
      setAssigningPatientId('');
    }
  };

  const filteredPatients = useMemo(() => patients.filter((patient) =>
    `${patient.patientId || ''} ${patient.patientName || ''} ${patient.patientmobileNo || ''} ${patient.patientEmailId || ''}`
      .toLowerCase().includes(search.toLowerCase())
  ), [patients, search]);

  return (
    <section className="workflow-page" aria-labelledby="patients-title">
      <header className="workflow-header">
        <div>
          <p className="workflow-eyebrow">Patient records</p>
          <h1 id="patients-title">Patients</h1>
          <p>Each patient is registered when an appointment is booked and identified by one permanent Patient ID.</p>
        </div>
        <div className="workflow-toolbar-actions">
          <button className="workflow-button subtle" type="button" onClick={refresh} disabled={loading}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button className="workflow-button primary" type="button" onClick={() => setShowAdmissionForm((shown) => !shown)}>
            Admit existing patient
          </button>
        </div>
      </header>

      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}

      {showAdmissionForm && <form className="workflow-form-panel" onSubmit={submitAdmission}>
        <div className="workflow-panel-heading"><div><h2>Admit patient</h2><p>Admission attaches to an existing patient record and preserves their Patient ID.</p></div><button className="workflow-button subtle" type="button" onClick={() => setShowAdmissionForm(false)}>Cancel</button></div>
        <div className="workflow-form-grid">
          <label>Patient<select required value={admissionForm.patientId} onChange={(event) => setAdmissionForm({ ...admissionForm, patientId: event.target.value })}><option value="">Select a patient</option>{patients.filter((patient) => !patient.patientAdmitdate || patient.patientDischargedate).map((patient) => <option key={patient.patientId} value={patient.patientId}>{patient.patientName} · {patient.patientId}</option>)}</select></label>
          <label>Ward / unit<select required value={admissionForm.wardId} onChange={(event) => setAdmissionForm({ ...admissionForm, wardId: event.target.value, bedId: '' })}>
            <option value="">Select ward</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name} · {ward.type}</option>)}
          </select></label>
          <label>Vacant bed<select required value={admissionForm.bedId} onChange={(event) => setAdmissionForm({ ...admissionForm, bedId: event.target.value })} disabled={!admissionForm.wardId}>
            <option value="">Select vacant bed</option>{(wards.find((ward) => ward.id === admissionForm.wardId)?.beds || []).filter((bed) => bed.status === 'VACANT').map((bed) => <option key={bed.id} value={bed.id}>{bed.bedNumber}</option>)}
          </select></label>
        </div>
        {!wards.length && <p className="workflow-alert error">Create a ward and vacant beds in Nursing &amp; Ward Management before admitting patients.</p>}
        <div className="workflow-form-actions"><button className="workflow-button primary" type="submit" disabled={busy || !admissionForm.patientId || !admissionForm.wardId || !admissionForm.bedId}>{busy ? 'Admitting…' : 'Admit patient'}</button></div>
      </form>}

      <section className="workflow-panel">
        <div className="workflow-panel-heading">
          <div><h2>Patient directory</h2><p>{patients.length} patient records</p></div>
          <label className="workflow-search">
            <Search size={15} aria-hidden="true" />
            <input aria-label="Search patients" placeholder="Search name, ID, phone, or email" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>
        {loading ? <div className="workflow-empty">Loading patient records…</div>
          : !filteredPatients.length ? <div className="workflow-empty"><UserRound size={18} /> No patient records match this search.</div>
            : <div className="workflow-table-wrap"><table className="workflow-table">
              <thead><tr><th>Patient ID</th><th>Patient</th><th>Contact</th><th>Admission</th><th>Ward / status</th><th>Nurse assignment</th></tr></thead>
              <tbody>{filteredPatients.map((patient) => (
                <tr key={patient.id || patient.patientId}>
                  <td><strong>{patient.patientId || 'ID unavailable'}</strong></td>
                  <td><strong>{patient.patientName || 'Name unavailable'}</strong><small>{[patient.patientAge && `${patient.patientAge} years`, patient.gender].filter(Boolean).join(' · ') || 'Demographics not recorded'}</small></td>
                  <td><strong>{patient.patientmobileNo || '—'}</strong><small>{patient.patientEmailId || '—'}</small></td>
                  <td>{patient.patientAdmitdate || 'Outpatient'}{patient.patientDischargedate && <small>Discharged {patient.patientDischargedate}</small>}</td>
                  <td>{patient.patientAdmitdate && !patient.patientDischargedate ? patient.patientWardnum || 'Ward not assigned' : patient.patientDischargedate ? 'Discharged' : 'Not admitted'}</td>
                  <td>{patient.patientAdmitdate && !patient.patientDischargedate ? <div className="patient-nurse-assignment">
                    {patient.patientNurseassign && <small>Assigned: {patient.patientNurseassign}</small>}
                    {canAssignNurse && <div className="patient-nurse-assignment-actions"><select
                      aria-label={`Nurse for ${patient.patientName}`}
                      value={nurseSelections[patient.patientId] || ''}
                      onChange={(event) => setNurseSelections((current) => ({
                        ...current,
                        [patient.patientId]: event.target.value,
                      }))}
                      disabled={!nurses.length || assigningPatientId === patient.patientId}
                    >
                      <option value="">Select nurse</option>
                      {nurses.map((nurse) => <option key={nurse.id} value={nurse.id}>
                        {nurse.name}
                      </option>)}
                    </select>
                    <button
                      className="workflow-button primary"
                      type="button"
                      disabled={!nurses.length || !nurseSelections[patient.patientId] || assigningPatientId === patient.patientId}
                      onClick={() => assignNurse(patient)}
                    >
                      {assigningPatientId === patient.patientId ? 'Assigning…' : patient.patientNurseId ? 'Update nurse' : 'Assign nurse'}
                    </button>
                    {!nurses.length && <small>No active nurse accounts found.</small>}</div>}
                    {!canAssignNurse && !patient.patientNurseassign && <span>Not assigned</span>}
                  </div> : <span>Admit patient to assign a nurse</span>}</td>
                </tr>
              ))}</tbody>
            </table></div>}
      </section>
    </section>
  );
}
