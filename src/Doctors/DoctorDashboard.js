import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CalendarDays, ClipboardList, LogOut, RefreshCw, Stethoscope, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../API/api';
import './DoctorDashboard.css';

const emptyConsultation = {
  symptoms: '',
  bloodPressure: '',
  pulse: '',
  temperature: '',
  oxygenSaturation: '',
  weight: '',
  diagnosis: '',
  prescription: '',
  labOrders: '',
  doctorNotes: '',
  followUpDate: '',
};

async function readResponse(response, fallback) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || fallback);
  return data;
}

export default function DoctorDashboard() {
  const [dashboard, setDashboard] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [patient360, setPatient360] = useState(null);
  const [consultation, setConsultation] = useState(emptyConsultation);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await readResponse(
        await apiFetch('/doctor-portal/dashboard'),
        'Could not load today’s doctor dashboard',
      );
      if (!Array.isArray(result.appointments)) throw new Error('Doctor dashboard returned an invalid appointment list');
      setDashboard(result);
    } catch (requestError) {
      setError(requestError.message || 'Could not load doctor dashboard');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const appointments = useMemo(() => dashboard?.appointments ?? [], [dashboard?.appointments]);
  const doctor = dashboard?.doctor;
  const recentPatients = useMemo(() => {
    const seen = new Set();
    return appointments.filter((appointment) => {
      if (!appointment.patientId || seen.has(appointment.patientId)) return false;
      seen.add(appointment.patientId);
      return true;
    }).slice(0, 8);
  }, [appointments]);

  const selectAppointment = async (appointment) => {
    setSelectedAppointment(appointment);
    setPatient360(null);
    setConsultation(emptyConsultation);
    setSuccess('');
    setError('');
    if (!appointment.patientId) {
      setError('This appointment has no Patient ID, so its medical record cannot be opened.');
      return;
    }
    try {
      const result = await readResponse(
        await apiFetch(`/doctor-portal/patients/${encodeURIComponent(appointment.patientId)}`),
        'Could not load the patient record',
      );
      setPatient360(result);
    } catch (requestError) {
      setError(requestError.message || 'Could not load the patient record');
    }
  };

  const submitConsultation = async (event) => {
    event.preventDefault();
    if (!selectedAppointment) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      await readResponse(await apiFetch('/doctor-portal/consultations', {
        method: 'POST',
        body: JSON.stringify({
          ...consultation,
          appointmentId: selectedAppointment.id,
          labOrders: consultation.labOrders.split(/\n|,/).map((order) => order.trim()).filter(Boolean),
        }),
      }), 'Could not complete the consultation');
      setSuccess(`Consultation saved for ${selectedAppointment.patientName}.`);
      setSelectedAppointment(null);
      setPatient360(null);
      setConsultation(emptyConsultation);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not complete the consultation');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    try {
      await apiFetch('/users/logout', { method: 'POST' });
    } finally {
      navigate('/DoctorLogin', { replace: true });
    }
  };

  const updateConsultation = (event) => {
    const { name, value } = event.target;
    setConsultation((current) => ({ ...current, [name]: value }));
  };

  return (
    <main className="doctor-workspace">
      <header className="doctor-topbar">
        <a className="doctor-brand" href="/DoctorDashboard">MEDCARE <span>CLINICAL</span></a>
        <div className="doctor-account">
          <span>{doctor?.doctorName || 'Doctor workspace'}</span>
          <button type="button" onClick={logout} aria-label="Sign out"><LogOut size={17} /> Sign out</button>
        </div>
      </header>

      <div className="doctor-layout">
        <aside className="doctor-sidebar" aria-label="Doctor navigation">
          <a href="#doctor-dashboard" className="active"><Activity size={17} /> Dashboard</a>
          <a href="#today-appointments"><CalendarDays size={17} /> Appointments</a>
          <a href="#patient-360"><UserRound size={17} /> Patients</a>
          <a href="#consultation"><ClipboardList size={17} /> Consultation</a>
          <a href="#consultation"><Stethoscope size={17} /> Clinical notes</a>
        </aside>

        <section className="doctor-main" id="doctor-dashboard">
          <div className="doctor-page-heading">
            <div>
              <p className="doctor-eyebrow">Doctor workspace</p>
              <h1>Good day, {doctor?.doctorName || 'Doctor'}</h1>
              <p>{doctor?.doctorSpecialistName || 'Today’s clinical schedule and patient care'}</p>
            </div>
            <button className="doctor-refresh" type="button" onClick={refresh} disabled={loading}>
              <RefreshCw size={15} /> Refresh
            </button>
          </div>

          {error && <div className="doctor-alert error" role="alert">{error}</div>}
          {success && <div className="doctor-alert success" role="status">{success}</div>}

          <div className="doctor-stats">
            <article><span>Upcoming patients</span><strong>{loading ? '—' : appointments.length}</strong><small>Today and future appointments</small></article>
            <article><span>Waiting / upcoming</span><strong>{loading ? '—' : dashboard?.waitingCount ?? 0}</strong><small>Pending or confirmed</small></article>
            <article><span>Follow-ups</span><strong>{loading ? '—' : dashboard?.followUpCount ?? 0}</strong><small>Marked in visit reason</small></article>
          </div>

          <section className="doctor-panel" id="today-appointments">
            <div className="doctor-panel-heading">
              <div><h2>Upcoming appointments</h2><p>Scheduled from {dashboard?.fromDate || 'today'} onward</p></div>
            </div>
            {loading ? <p className="doctor-empty">Loading your appointment schedule…</p>
              : appointments.length === 0 ? <p className="doctor-empty">No upcoming appointments scheduled for this doctor.</p>
                : <div className="doctor-table-scroll"><table className="doctor-table">
                  <thead><tr><th>Date</th><th>Time</th><th>Patient</th><th>Visit reason</th><th>Status</th><th /></tr></thead>
                  <tbody>{appointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td>{appointment.date || '—'}</td>
                      <td>{appointment.time || '—'}</td>
                      <td><strong>{appointment.patientName || 'Patient'}</strong><small>{appointment.patientId || 'Patient ID missing'}</small></td>
                      <td>{appointment.reason || 'Consultation'}</td>
                      <td><span className="doctor-status">{appointment.appointmentStatus || 'pending'}</span></td>
                      <td><button className="doctor-open-button" type="button" onClick={() => selectAppointment(appointment)}>Open patient</button></td>
                    </tr>
                  ))}</tbody>
                </table></div>}
          </section>

          <section className="doctor-panel" id="patient-360">
            <div className="doctor-panel-heading"><div><h2>Recent patients</h2><p>Patients from this doctor’s upcoming appointments</p></div></div>
            {!recentPatients.length ? <p className="doctor-empty">Patient list will appear when appointments are scheduled.</p>
              : <div className="doctor-recent-list">{recentPatients.map((appointment) => (
                <button key={appointment.patientId} type="button" onClick={() => selectAppointment(appointment)}>
                  <span>{appointment.patientName || 'Patient'}</span><small>{appointment.patientId}</small>
                </button>
              ))}</div>}
          </section>

          {selectedAppointment && <section className="doctor-panel doctor-clinical-panel">
            <div className="doctor-panel-heading">
              <div><p className="doctor-eyebrow">Patient 360</p><h2>{patient360?.patient?.patientName || selectedAppointment.patientName}</h2>
                <p>Patient ID: {selectedAppointment.patientId} · {selectedAppointment.date} at {selectedAppointment.time}</p></div>
              <button type="button" className="doctor-refresh" onClick={() => setSelectedAppointment(null)}>Close</button>
            </div>

            {patient360 && <>
              <div className="doctor-patient-summary">
                <span>{patient360.patient.patientAge ? `${patient360.patient.patientAge} years` : 'Age not recorded'}</span>
                <span>{patient360.patient.gender || 'Gender not recorded'}</span>
                <span>{patient360.patient.patientmobileNo || 'Phone not recorded'}</span>
                <span>Prior visits: {patient360.consultations?.length || 0}</span>
              </div>
              <section className="doctor-history">
                <h3>Medical history</h3>
                {patient360.consultations?.length
                  ? patient360.consultations.map((item) => <article key={item.id}>
                    <strong>{item.diagnosis}</strong><span>{new Date(item.createdAt).toLocaleString()}</span>
                    {item.symptoms && <p>Symptoms: {item.symptoms}</p>}
                    {item.prescription && <p>Prescription: {item.prescription}</p>}
                    {item.doctorNotes && <p>Notes: {item.doctorNotes}</p>}
                  </article>)
                  : <p>No prior consultation records are available.</p>}
                {patient360.patient.patientPrescription && <article>
                  <strong>Existing patient prescription</strong>
                  <p>{patient360.patient.patientPrescription}</p>
                </article>}
              </section>
            </>}

            <form id="consultation" className="doctor-consultation-form" onSubmit={submitConsultation}>
              <h3>Complete consultation</h3>
              <label className="doctor-wide">Symptoms<textarea name="symptoms" rows="2" value={consultation.symptoms} onChange={updateConsultation} /></label>
              <fieldset className="doctor-vitals">
                <legend>Vitals</legend>
                <label>Blood pressure<input name="bloodPressure" placeholder="e.g. 120/80 mmHg" value={consultation.bloodPressure} onChange={updateConsultation} /></label>
                <label>Pulse<input name="pulse" placeholder="bpm" value={consultation.pulse} onChange={updateConsultation} /></label>
                <label>Temperature<input name="temperature" placeholder="°C" value={consultation.temperature} onChange={updateConsultation} /></label>
                <label>Oxygen saturation<input name="oxygenSaturation" placeholder="%" value={consultation.oxygenSaturation} onChange={updateConsultation} /></label>
                <label>Weight<input name="weight" placeholder="kg" value={consultation.weight} onChange={updateConsultation} /></label>
              </fieldset>
              <label className="doctor-wide">Diagnosis<input required name="diagnosis" value={consultation.diagnosis} onChange={updateConsultation} /></label>
              <label className="doctor-wide">Prescription<textarea rows="2" name="prescription" value={consultation.prescription} onChange={updateConsultation} /></label>
              <label className="doctor-wide">Lab / diagnostic orders<textarea rows="2" name="labOrders" placeholder="One order per line" value={consultation.labOrders} onChange={updateConsultation} /></label>
              <label className="doctor-wide">Doctor notes<textarea rows="3" name="doctorNotes" value={consultation.doctorNotes} onChange={updateConsultation} /></label>
              <label>Follow-up date<input type="date" name="followUpDate" value={consultation.followUpDate} onChange={updateConsultation} /></label>
              <div className="doctor-form-actions"><button className="doctor-submit"
                disabled={saving || !patient360 || selectedAppointment.appointmentStatus === 'completed'}>
                {selectedAppointment.appointmentStatus === 'completed'
                  ? 'Appointment completed'
                  : saving ? 'Saving consultation…' : 'Complete consultation'}
              </button></div>
            </form>
          </section>}
        </section>
      </div>
    </main>
  );
}
