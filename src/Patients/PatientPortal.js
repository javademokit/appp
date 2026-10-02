import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '../API/api';
import '../Operations/Operations.css';

const emptyAppointment = { doctorId: '', doctor: '', date: '', time: '', reason: '' };
const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export default function PatientPortal() {
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [form, setForm] = useState(emptyAppointment);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileResponse, appointmentsResponse, doctorsResponse] = await Promise.all([
        apiFetch('/patient-portal/profile'),
        apiFetch('/patient-portal/appointments'),
        apiFetch('/doctors'),
      ]);
      const responses = [profileResponse, appointmentsResponse, doctorsResponse];
      const results = await Promise.all(responses.map(async (response) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof data.message === 'string' ? data.message : 'Could not load patient portal data');
        }
        return data;
      }));
      setProfile(results[0]);
      setAppointments(results[1]);
      setDoctors(results[2]);
    } catch (requestError) {
      setError(requestError.message || 'Could not load patient portal data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!form.doctorId || !form.date) {
      setAvailableTimes([]);
      setLoadingAvailability(false);
      return undefined;
    }

    let active = true;
    const loadAvailability = async () => {
      setLoadingAvailability(true);
      setAvailableTimes([]);
      setForm((current) => ({ ...current, time: '' }));
      try {
        const query = new URLSearchParams({ doctorId: form.doctorId, date: form.date });
        const response = await apiFetch(`/patient-portal/availability?${query}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || data.detail || `Could not load available appointment times (${response.status})`);
        }
        if (active) setAvailableTimes(Array.isArray(data) ? data : []);
      } catch (requestError) {
        if (active) setError(requestError.message || 'Could not load available appointment times');
      } finally {
        if (active) setLoadingAvailability(false);
      }
    };

    loadAvailability();
    return () => { active = false; };
  }, [form.doctorId, form.date]);

  const bookAppointment = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch('/patient-portal/appointments', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const validationErrors = Array.isArray(data.errors)
          ? data.errors.map((entry) => entry.defaultMessage || entry.message || entry).filter(Boolean).join('; ')
          : '';
        throw new Error(data.message || data.detail || data.title || validationErrors
          || (data.error ? `${data.error} (${response.status})` : `Could not book appointment (${response.status})`));
      }
      setForm(emptyAppointment);
      setSuccess(`Appointment booked for ${data.date} at ${data.time}.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not book appointment');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="workflow-page" aria-labelledby="patient-portal-title" aria-busy={loading}>
      <header className="workflow-header">
        <div><p className="workflow-eyebrow">Patient self-service</p><h1 id="patient-portal-title">Patient portal</h1><p>Manage appointments linked to your existing medical record.</p></div>
        <button className="workflow-button subtle" type="button" onClick={refresh} disabled={loading}>Refresh</button>
      </header>
      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}

      {profile && <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>Your patient profile</h2><p>Identity is matched to your verified account email.</p></div></div>
        <div className="patient-portal-profile">
          <strong>{profile.patientName}</strong><span>Patient ID: {profile.patientId}</span>
          <span>{profile.patientAge ? `${profile.patientAge} years` : 'Age not recorded'} · {profile.gender || 'Gender not recorded'}</span>
        </div>
      </section>}

      <form className="workflow-form-panel" onSubmit={bookAppointment}>
        <div className="workflow-panel-heading"><div><h2>Book an appointment</h2><p>Choose an available doctor and time from their schedule.</p></div></div>
        <div className="workflow-form-grid">
          <label>Doctor<select required value={form.doctorId} onChange={(event) => {
            const doctor = doctors.find((entry) => entry.id === event.target.value);
            setForm({ ...form, doctorId: event.target.value, doctor: doctor?.doctorName || '', time: '' });
          }}><option value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.doctorName} · {doctor.doctorSpecialistName}</option>)}</select></label>
          <label>Date<input required type="date" min={localDate(new Date())} value={form.date} onChange={(event) => setForm({ ...form, date: event.target.value, time: '' })} /></label>
          <label>Available time<select required value={form.time} disabled={!form.doctorId || !form.date || loadingAvailability || !availableTimes.length} onChange={(event) => setForm({ ...form, time: event.target.value })}>
            <option value="">{loadingAvailability ? 'Checking availability…' : availableTimes.length ? 'Select time' : 'No available times'}</option>
            {availableTimes.map((slot) => <option key={slot} value={slot}>{slot}</option>)}
          </select></label>
          <label className="workflow-form-wide">Reason for visit<textarea rows="3" value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></label>
        </div>
        <div className="workflow-form-actions"><button className="workflow-button primary" disabled={busy || loading || loadingAvailability || !availableTimes.includes(form.time)}>{busy ? 'Booking…' : 'Book appointment'}</button></div>
      </form>

      <section className="workflow-panel">
        <div className="workflow-panel-heading"><div><h2>Your appointments</h2><p>Bookings associated with your Patient ID.</p></div></div>
        {loading ? <div className="workflow-empty">Loading appointments…</div> : !appointments.length ? <div className="workflow-empty">No appointments found.</div> : <div className="workflow-table-wrap"><table className="workflow-table">
          <thead><tr><th>Date</th><th>Time</th><th>Doctor</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>{appointments.map((appointment) => <tr key={appointment.id}><td>{appointment.date}</td><td>{appointment.time}</td><td>{appointment.doctor}</td><td>{appointment.reason || '—'}</td><td>{appointment.appointmentStatus}</td></tr>)}</tbody>
        </table></div>}
      </section>
    </section>
  );
}
