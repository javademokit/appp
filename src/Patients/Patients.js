import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, UserRound } from 'lucide-react';
import { apiFetch } from '../API/api';
import '../Operations/Operations.css';

export default function Patients() {
  const [patients, setPatients] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [showAdmissionForm, setShowAdmissionForm] = useState(false);
  const [admissionForm, setAdmissionForm] = useState({ patientId: '', wardNumber: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiFetch('/patients');
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.message || 'Could not load patient records');
      if (!Array.isArray(data)) throw new Error('Patient service returned an invalid response');
      setPatients(data);
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
        body: JSON.stringify({ wardNumber: admissionForm.wardNumber }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Could not admit patient');
      setAdmissionForm({ patientId: '', wardNumber: '' });
      setShowAdmissionForm(false);
      setSuccess(`${data.patientName} admitted under Patient ID ${data.patientId}.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not admit patient');
    } finally {
      setBusy(false);
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
          <label>Ward / unit<input required value={admissionForm.wardNumber} onChange={(event) => setAdmissionForm({ ...admissionForm, wardNumber: event.target.value })} /></label>
        </div>
        <div className="workflow-form-actions"><button className="workflow-button primary" type="submit" disabled={busy || !admissionForm.patientId}>{busy ? 'Admitting…' : 'Admit patient'}</button></div>
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
              <thead><tr><th>Patient ID</th><th>Patient</th><th>Contact</th><th>Admission</th><th>Ward / status</th></tr></thead>
              <tbody>{filteredPatients.map((patient) => (
                <tr key={patient.id || patient.patientId}>
                  <td><strong>{patient.patientId || 'ID unavailable'}</strong></td>
                  <td><strong>{patient.patientName || 'Name unavailable'}</strong><small>{[patient.patientAge && `${patient.patientAge} years`, patient.gender].filter(Boolean).join(' · ') || 'Demographics not recorded'}</small></td>
                  <td><strong>{patient.patientmobileNo || '—'}</strong><small>{patient.patientEmailId || '—'}</small></td>
                  <td>{patient.patientAdmitdate || 'Outpatient'}{patient.patientDischargedate && <small>Discharged {patient.patientDischargedate}</small>}</td>
                  <td>{patient.patientAdmitdate && !patient.patientDischargedate ? patient.patientWardnum || 'Ward not assigned' : patient.patientDischargedate ? 'Discharged' : 'Not admitted'}</td>
                </tr>
              ))}</tbody>
            </table></div>}
      </section>
    </section>
  );
}
