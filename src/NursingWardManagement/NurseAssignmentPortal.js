import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, UserRound, Users } from 'lucide-react';
import { apiFetch } from '../API/api';
import '../Operations/Operations.css';
import './WardManagement.css';
import './NurseAssignmentPortal.css';

const getErrorMessage = async (response, fallback) => {
  const body = await response.json().catch(() => ({}));
  return body.message || body.detail || body.title || fallback;
};

const loadJson = async (path) => {
  const response = await apiFetch(path);
  if (!response.ok) throw new Error(await getErrorMessage(response, `Request failed (${response.status})`));
  return response.json();
};

const normalize = (value) => String(value || '').trim().toLowerCase();

export default function NurseAssignmentPortal() {
  const [nurses, setNurses] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedNurseId, setSelectedNurseId] = useState('');
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const visibleNurses = useMemo(() => {
    const search = normalize(query);
    if (!search) return nurses;
    const digits = search.replace(/\D/g, '');
    return nurses.filter((nurse) => [
      nurse.name,
      nurse.employeeCode,
      nurse.mobileNo,
      nurse.emailId,
    ].some((value) => normalize(value).includes(search)
      || (digits && String(value || '').replace(/\D/g, '').includes(digits))));
  }, [nurses, query]);

  const fetchAssignments = async (nurseId) => {
    if (!nurseId) {
      setAssignments([]);
      return;
    }
    setSearching(true);
    setError('');
    try {
      const result = await loadJson(`/nursing/nurses/${encodeURIComponent(nurseId)}/assignments`);
      setAssignments(result);
    } catch (requestError) {
      setAssignments([]);
      setError(requestError.message || 'Could not load nurse assignments.');
    } finally {
      setSearching(false);
    }
  };

  const refreshNurses = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await loadJson('/users/me');
      const roles = (user.roles || []).map((role) => String(role).replace(/^ROLE_/, '').toUpperCase());
      if (!roles.some((role) => ['NURSE', 'HEAD_NURSE'].includes(role))) {
        throw new Error('This page is available to nurse accounts only.');
      }
      const nurseList = await loadJson('/nursing/nurses');
      setNurses(nurseList.filter((nurse) => nurse.employmentActive));
    } catch (requestError) {
      setError(requestError.message || 'Could not load the nurse directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refreshNurses(); }, []);

  const selectedNurse = nurses.find((nurse) => nurse.id === selectedNurseId);

  return (
    <section className="workflow-page nurse-assignment-page" aria-labelledby="nurse-assignment-title">
      <header className="workflow-header">
        <div>
          <p className="workflow-eyebrow">Nurse workspace</p>
          <h1 id="nurse-assignment-title">Nurse assignments</h1>
          <p>Find a nurse by nurse ID, name, or mobile number to view their active patient assignments.</p>
        </div>
        <button className="workflow-button subtle" type="button" onClick={refreshNurses} disabled={loading}>
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      {error && <div className="workflow-alert error" role="alert">{error}</div>}

      <section className="workflow-panel nurse-lookup-panel">
        <div className="workflow-panel-heading">
          <div><h2>Find nurse</h2><p>Search by nurse ID, name, or mobile number, then select a nurse.</p></div>
          <Users size={20} aria-hidden="true" />
        </div>
        <div className="nurse-lookup-controls">
          <label>
            Search nurse
            <span className="nurse-lookup-input-wrap">
              <Search size={16} aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Nurse ID, name, or mobile number"
                aria-label="Search by nurse ID, name, or mobile number"
              />
            </span>
          </label>
          <label>
            Select nurse
            <select
              value={selectedNurseId}
              onChange={(event) => {
                setSelectedNurseId(event.target.value);
                fetchAssignments(event.target.value);
              }}
              disabled={loading || !visibleNurses.length}
            >
              <option value="">{loading ? 'Loading nurses…' : 'Choose a nurse'}</option>
              {visibleNurses.map((nurse) => <option key={nurse.id} value={nurse.id}>
                {[nurse.employeeCode, nurse.name, nurse.mobileNo].filter(Boolean).join(' · ')}
              </option>)}
            </select>
          </label>
        </div>
        {!loading && !visibleNurses.length && <p className="nurse-lookup-empty">
          {nurses.length ? 'No nurse matches that ID, name, or mobile number.' : 'No active nurse employment records were found.'}
        </p>}
      </section>

      {selectedNurse && <section className="nurse-selected-identity" aria-live="polite">
        <span className="nurse-selected-icon"><UserRound size={19} /></span>
        <div><strong>{selectedNurse.name}</strong>
          <span>{selectedNurse.employeeCode}{selectedNurse.mobileNo ? ` · ${selectedNurse.mobileNo}` : ''}</span></div>
        <span className="nurse-assignment-count">{assignments.length} active {assignments.length === 1 ? 'assignment' : 'assignments'}</span>
      </section>}

      <section className="workflow-panel nurse-assignment-results" aria-live="polite">
        <div className="workflow-panel-heading">
          <div><h2>{selectedNurse ? `${selectedNurse.name}'s patients` : 'Assigned patients'}</h2>
            <p>Currently active assignments for the selected nurse.</p></div>
        </div>
        {searching ? <div className="workflow-empty">Loading assignments…</div>
          : !selectedNurse ? <div className="workflow-empty">Search for and select a nurse to see assignments.</div>
            : !assignments.length ? <div className="workflow-empty">No active patients are assigned to this nurse.</div>
              : <div className="workflow-table-wrap"><table className="workflow-table">
                <thead><tr><th>Patient</th><th>Mobile</th><th>Ward / bed</th><th>Shift / role</th><th>Admitted</th><th>Allergies</th></tr></thead>
                <tbody>{assignments.map((row) => {
                  const patient = row.patient || {};
                  const bed = row.bed || {};
                  const ward = row.ward || {};
                  return <tr key={row.assignment?.id || patient.patientId}>
                    <td><strong>{patient.patientName || 'Patient'}</strong><small>{patient.patientId || row.assignment?.patientId}</small></td>
                    <td>{patient.patientmobileNo || '—'}</td>
                    <td>{ward.name || patient.patientWardnum || '—'}<small>{bed.room?.roomNumber ? `Room ${bed.room.roomNumber} · ` : ''}{bed.bedNumber || 'Bed unavailable'}</small></td>
                    <td>{row.assignment?.shift || '—'}<small>{row.assignment?.role || 'PRIMARY'}</small></td>
                    <td>{patient.patientAdmitdate || '—'}</td>
                    <td>{patient.patientAllergies || 'None recorded'}</td>
                  </tr>;
                })}</tbody>
              </table></div>}
      </section>
    </section>
  );
}
