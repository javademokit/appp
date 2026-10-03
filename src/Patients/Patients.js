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
  const [bedPreference, setBedPreference] = useState({ acType: '', category: '' });
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
    setSuccess('');
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
      if (!Array.isArray(patientData)) throw new Error('Patient service returned an invalid patient list');

      const sortedPatients = [...patientData].sort((first, second) =>
        String(first.patientName || '').localeCompare(String(second.patientName || ''), undefined, { sensitivity: 'base' })
      );
      setPatients(sortedPatients);
      setNurses(nurseResponse.ok && Array.isArray(nurseData)
        ? nurseData.filter((nurse) => nurse.profileComplete && nurse.status === 'ACTIVE')
        : []);
      setWards(wardResponse.ok && Array.isArray(wardData) ? wardData : []);
      setCanAssignNurse(userResponse.ok && Array.isArray(userData.roles) && userData.roles.some((role) => (
        ['SUPER_ADMIN', 'HOSPITAL_ADMIN', 'CLINIC_ADMIN', 'CRM_EXECUTIVE'].includes(
          String(role).trim().toUpperCase().replace(/^ROLE_/, ''),
        )
      )));
      setNurseSelections(Object.fromEntries(
        sortedPatients.map((patient) => [patient.patientId, patient.patientNurseId || '']),
      ));
      const unavailableSupportingData = [
        !nurseResponse.ok && 'nurse options',
        !wardResponse.ok && 'ward and bed details',
        !userResponse.ok && 'nurse assignment permissions',
      ].filter(Boolean);
      if (unavailableSupportingData.length) {
        setSuccess(`Patient records loaded. Some supporting data is unavailable: ${unavailableSupportingData.join(', ')}.`);
      }
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

  const addToBedWaitingList = async () => {
    if (!admissionForm.patientId || !admissionForm.wardId) {
      setError('Choose a patient and preferred ward before adding to the waiting list.');
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch('/nursing/bed-waiting-list', {
        method: 'POST',
        body: JSON.stringify({
          patientId: admissionForm.patientId,
          wardId: admissionForm.wardId,
          preferredAcType: bedPreference.acType || null,
          preferredCategory: bedPreference.category || null,
          priority: 'NORMAL',
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || data.detail || 'Could not add patient to the bed waiting list');
      setSuccess(`${data.patientName || 'Patient'} added to the bed waiting list for ${wards.find((ward) => ward.id === data.wardId)?.name || 'the selected ward'}.`);
      setShowAdmissionForm(false);
      setAdmissionForm({ patientId: '', wardId: '', bedId: '' });
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not add patient to the bed waiting list');
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

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredPatients = useMemo(() => patients.filter((patient) =>
    `${patient.patientId || ''} ${patient.patientName || ''} ${patient.patientmobileNo || ''} ${patient.patientEmailId || ''}`
      .toLocaleLowerCase().includes(normalizedSearch)
  ), [patients, normalizedSearch]);
  const admissionCandidates = useMemo(() => patients.filter((patient) =>
    !patient.patientAdmitdate || patient.patientDischargedate
  ), [patients]);
  const availableAdmissionBeds = useMemo(() => (wards.find((ward) => ward.id === admissionForm.wardId)?.beds || [])
    .filter((bed) => bed.status === 'VACANT' && (!bed.room?.status || bed.room.status === 'ACTIVE'))
    .filter((bed) => !bedPreference.acType || bed.room?.acType === bedPreference.acType)
    .filter((bed) => !bedPreference.category
      || String(bed.room?.category || '').toLowerCase().includes(bedPreference.category.toLowerCase()))
    .filter((bed) => {
      const patient = patients.find((entry) => entry.patientId === admissionForm.patientId);
      const rawGender = String(patient?.gender || '').toUpperCase();
      const gender = ['M', 'MALE'].includes(rawGender) ? 'MALE' : ['F', 'FEMALE'].includes(rawGender) ? 'FEMALE' : rawGender;
      return !bed.room?.genderRestriction || bed.room.genderRestriction === 'ANY'
        || bed.room.genderRestriction === gender;
    }), [wards, admissionForm.wardId, admissionForm.patientId, bedPreference, patients]);

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
          <label>Patient<select required value={admissionForm.patientId} onChange={(event) => setAdmissionForm({ ...admissionForm, patientId: event.target.value })}><option value="">Select a patient</option>{admissionCandidates.map((patient) => <option key={patient.patientId} value={patient.patientId}>{patient.patientName || 'Name unavailable'} — {patient.patientId || 'ID unavailable'}</option>)}</select>
            <small>{admissionCandidates.length} eligible patient{admissionCandidates.length === 1 ? '' : 's'} · currently admitted patients are excluded</small>
          </label>
          <label>Ward / unit<select required value={admissionForm.wardId} onChange={(event) => setAdmissionForm({ ...admissionForm, wardId: event.target.value, bedId: '' })}>
            <option value="">Select ward</option>{wards.map((ward) => <option key={ward.id} value={ward.id}>{ward.name} · {ward.type}</option>)}
          </select></label>
          <label>Preferred AC type<select value={bedPreference.acType} onChange={(event) => setBedPreference({ ...bedPreference, acType: event.target.value })}><option value="">Any AC type</option><option value="AC">AC</option><option value="NON_AC">Non-AC</option></select></label>
          <label>Preferred room category<input value={bedPreference.category} onChange={(event) => setBedPreference({ ...bedPreference, category: event.target.value })} placeholder="e.g. Private or ICU" /></label>
          <label>Available bed<select required value={admissionForm.bedId} onChange={(event) => setAdmissionForm({ ...admissionForm, bedId: event.target.value })} disabled={!admissionForm.wardId}>
            <option value="">{availableAdmissionBeds.length ? 'Select matching vacant bed' : 'No matching vacant beds'}</option>{availableAdmissionBeds.map((bed) => <option key={bed.id} value={bed.id}>
              {bed.bedNumber}{bed.room?.roomNumber ? ` · Room ${bed.room.roomNumber}` : ''}{bed.room?.category ? ` · ${bed.room.category}` : ''}{bed.room?.acType === 'AC' ? ' · AC' : bed.room?.acType === 'NON_AC' ? ' · Non-AC' : ''}
            </option>)}
          </select></label>
        </div>
        {!wards.length && <p className="workflow-alert error">Create a ward and vacant beds in Nursing &amp; Ward Management before admitting patients.</p>}
        <div className="workflow-form-actions">
          <button className="workflow-button primary" type="submit" disabled={busy || !admissionForm.patientId || !admissionForm.wardId || !admissionForm.bedId}>{busy ? 'Admitting…' : 'Admit patient'}</button>
          {admissionForm.patientId && admissionForm.wardId && !availableAdmissionBeds.length
            && <button className="workflow-button subtle" type="button" disabled={busy} onClick={addToBedWaitingList}>Add to waiting list</button>}
        </div>
      </form>}

      <section className="workflow-panel">
        <div className="workflow-panel-heading">
          <div><h2>Patient directory</h2><p>Showing {filteredPatients.length} of {patients.length} patient records</p></div>
          <label className="workflow-search">
            <Search size={15} aria-hidden="true" />
            <input aria-label="Search patients" placeholder="Search name, ID, phone, or email" value={search} onChange={(event) => setSearch(event.target.value)} />
          </label>
        </div>
        {loading ? <div className="workflow-empty">Loading patient records…</div>
          : !filteredPatients.length ? <div className="workflow-empty"><UserRound size={18} /> No patient records match this search.</div>
            : <div className="workflow-table-wrap"><table className="workflow-table">
              <thead><tr><th>Patient</th><th>Contact</th><th>Admission</th><th>Ward / status</th><th>Nurse assignment</th></tr></thead>
              <tbody>{filteredPatients.map((patient) => (
                <tr key={patient.id || patient.patientId}>
                  <td><strong>{patient.patientName || 'Name unavailable'}</strong><small>Patient ID: {patient.patientId || 'ID unavailable'}</small><small>{[patient.patientAge && `${patient.patientAge} years`, patient.gender].filter(Boolean).join(' · ') || 'Demographics not recorded'}</small></td>
                  <td><strong>{patient.patientmobileNo || '—'}</strong><small>{patient.patientEmailId || '—'}</small></td>
                  <td>{patient.patientAdmitdate || 'Outpatient'}{patient.patientDischargedate && <small>Discharged {patient.patientDischargedate}</small>}</td>
                  <td>{patient.patientAdmitdate && !patient.patientDischargedate ? <>
                    {patient.patientWardnum || 'Ward not assigned'}
                    {patient.patientBedId && <small>{(() => {
                      const currentBed = wards.find((ward) => ward.id === patient.patientWardId)?.beds?.find((bed) => bed.id === patient.patientBedId);
                      return [currentBed?.room?.roomNumber && `Room ${currentBed.room.roomNumber}`, currentBed?.bedNumber || patient.patientBedId].filter(Boolean).join(' · ');
                    })()}</small>}
                  </> : patient.patientDischargedate ? 'Discharged' : 'Not admitted'}</td>
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
