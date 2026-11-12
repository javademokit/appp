import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../API/api';
import { doctorDepartment, doctorOptionLabel } from '../utils/doctorDisplay';
import { downloadAppointmentConfirmation } from './appointmentConfirmation';
import { startPatientAppointmentCheckout } from '../PaymentPage/paymentGatewayCheckout';
import BrandLogo from '../components/BrandLogo';
import '../Operations/Operations.css';

const emptyAppointment = { doctorId: '', doctor: '', date: '', time: '', reason: '' };
const emptyProfileForm = {
  patientAge: '', gender: '', dateOfBirth: '', patientAddress: '',
  patientPan: '', patientAadhaar: '', patientPostalCode: '',
};
const emptyNewPatient = {
  patientName: '', patientAge: '', gender: '', mobileNo: '', patientAddress: '',
  patientDateOfBirth: '', patientPostalCode: '', patientPan: '', patientAadhaar: '',
};
const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const normalizeGender = (value) => {
  const gender = String(value || '').trim().toLowerCase();
  if (gender === 'male') return 'Male';
  if (gender === 'female') return 'Female';
  if (gender === 'other') return 'Other';
  if (gender === 'prefer not to say') return 'Prefer not to say';
  return '';
};

export default function PatientPortal() {
  const [profile, setProfile] = useState(null);
  const [selfPatientName, setSelfPatientName] = useState('');
  const [profileForm, setProfileForm] = useState(emptyProfileForm);
  const [appointments, setAppointments] = useState([]);
  const [paymentGateways, setPaymentGateways] = useState({});
  const [paymentGatewayError, setPaymentGatewayError] = useState('');
  const [requiresPatientSignIn, setRequiresPatientSignIn] = useState(false);
  const [paymentBusyId, setPaymentBusyId] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [form, setForm] = useState(emptyAppointment);
  const [patientMode, setPatientMode] = useState('self');
  const [patientLookupMode, setPatientLookupMode] = useState('name');
  const [patientLookup, setPatientLookup] = useState({ name: '', mobile: '' });
  const [patientMatches, setPatientMatches] = useState([]);
  const [hasSearchedPatients, setHasSearchedPatients] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [newPatient, setNewPatient] = useState(emptyNewPatient);
  const [searchingPatients, setSearchingPatients] = useState(false);
  const [loading, setLoading] = useState(true);
  const selectedDoctor = doctors.find((doctor) => doctor.id === form.doctorId);
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
      const endpoints = ['/patient-portal/profile', '/patient-portal/appointments', '/doctors'];
      const results = await Promise.all(responses.map(async (response, index) => {
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 401) {
            setRequiresPatientSignIn(true);
            throw new Error('Your patient session has expired. Sign in again to load your profile and appointments.');
          }
          if (response.status === 403) {
            setRequiresPatientSignIn(true);
            throw new Error('This account does not have patient portal access. Sign in with a patient account.');
          }
          throw new Error(`${data.message || data.detail || data.title
            || `Request failed (${response.status})`} [${endpoints[index]}]`);
        }
        return data;
      }));
      setRequiresPatientSignIn(false);
      setProfile(results[0]);
      setSelfPatientName(results[0].patientName || '');
      setProfileForm({
        patientAge: results[0].patientAge || '',
        gender: normalizeGender(results[0].gender),
        dateOfBirth: results[0].dateOfBirth || '',
        patientAddress: results[0].patientAddress || '',
        patientPan: '',
        patientAadhaar: '',
        patientPostalCode: results[0].patientPostalCode || '',
      });
      setAppointments(results[1]);
      setDoctors(results[2]);
      try {
        const gatewayResponse = await apiFetch('/patient-portal/payments/gateways');
        const gateways = await gatewayResponse.json().catch(() => ({}));
        if (!gatewayResponse.ok) {
          throw new Error(gateways.message || gateways.detail || gateways.title
            || `Payment options unavailable (${gatewayResponse.status})`);
        }
        setPaymentGateways(gateways || {});
        setPaymentGatewayError('');
      } catch (gatewayError) {
        setPaymentGateways({});
        setPaymentGatewayError(gatewayError.message || 'Online payment options could not be loaded.');
      }
    } catch (requestError) {
      setError(requestError.message || 'Could not load patient portal data');
    } finally {
      setLoading(false);
    }
  }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setSuccess('');
    try {
      const response = await apiFetch('/patient-portal/profile', {
        method: 'PUT',
        body: JSON.stringify(profileForm),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.detail || data.title || `Could not save profile (${response.status})`);
      }
      setProfile(data);
      setSelfPatientName(data.patientName || '');
      setProfileForm({
        patientAge: data.patientAge || '',
        gender: normalizeGender(data.gender),
        dateOfBirth: data.dateOfBirth || '',
        patientAddress: data.patientAddress || '',
        patientPan: '',
        patientAadhaar: '',
        patientPostalCode: '',
      });
      setSuccess('Your patient details were saved successfully.');
    } catch (requestError) {
      setError(requestError.message || 'Could not save your patient details.');
    } finally {
      setBusy(false);
    }
  };

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
      if (patientMode === 'existing' && !selectedPatient) {
        throw new Error('Search and select the patient before booking.');
      }
      if (patientMode === 'existing' && patientLookup.mobile.replace(/\D/g, '').length < 10) {
        throw new Error("Enter the selected patient's full mobile number to verify the booking.");
      }
      const patientDetails = patientMode === 'new'
        ? { ...newPatient, registerNewPatient: true }
        : {
          patientId: patientMode === 'existing' ? selectedPatient.patientId : profile.patientId,
          patientName: patientMode === 'existing' ? selectedPatient.patientName : selfPatientName.trim(),
          ...(patientMode === 'existing' ? {
            mobileNo: patientLookup.mobile,
          } : {}),
        };
      const response = await apiFetch('/patient-portal/appointments', {
        method: 'POST',
        body: JSON.stringify({ ...form, ...patientDetails }),
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
      setPatientMode('self');
      setPatientLookupMode('name');
      setPatientLookup({ name: '', mobile: '' });
      setPatientMatches([]);
      setHasSearchedPatients(false);
      setSelectedPatient(null);
      setNewPatient(emptyNewPatient);
      setSuccess(`Appointment booked for ${data.patientName || profile.patientName} on ${data.date} at ${data.time}. Booking number: ${data.appointmentNumber || '—'} · Token: ${data.tokenNumber ? String(data.tokenNumber).padStart(3, '0') : '—'}. Pay any outstanding fee online or at reception to confirm.`);
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not book appointment');
    } finally {
      setBusy(false);
    }
  };

  const payAppointmentOnline = async (appointment) => {
    setPaymentBusyId(appointment.id);
    setError('');
    setSuccess('');
    try {
      const invoice = await startPatientAppointmentCheckout(
        appointment.id,
        'RAZORPAY',
        () => {},
      );
      if (invoice) {
        await refresh();
        setSuccess('Payment confirmed successfully.');
      }
    } catch (requestError) {
      setError(requestError.message || 'Online payment could not be completed.');
    } finally {
      setPaymentBusyId('');
    }
  };

  const searchExistingPatients = async (event) => {
    event.preventDefault();
    setError('');
    setPatientMatches([]);
    setSelectedPatient(null);
    if (patientLookupMode === 'name-mobile' && patientLookup.mobile.replace(/\D/g, '').length < 10) {
      setError("Enter the patient's full mobile number to search by name and mobile.");
      return;
    }
    setSearchingPatients(true);
    try {
      const query = new URLSearchParams({ name: patientLookup.name.trim() });
      if (patientLookup.mobile.trim()) query.set('mobile', patientLookup.mobile.trim());
      const response = await apiFetch(`/patient-portal/patients/search?${query}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.message || data.detail || `Could not search patient records (${response.status})`);
      }
      if (!Array.isArray(data)) throw new Error('Patient search returned invalid results.');
      setPatientMatches(data);
      setHasSearchedPatients(true);
    } catch (requestError) {
      setHasSearchedPatients(false);
      setError(requestError.message || 'Could not search patient records.');
    } finally {
      setSearchingPatients(false);
    }
  };

  const downloadConfirmation = (appointment) => {
    try {
      downloadAppointmentConfirmation(appointment, profile);
    } catch (downloadError) {
      setError(downloadError.message || 'Could not download appointment confirmation');
    }
  };

  return (
    <section className="workflow-page" aria-labelledby="patient-portal-title" aria-busy={loading}>
      <header className="workflow-header">
        <div className="patient-portal-brand">
          <BrandLogo />
          <div><p className="workflow-eyebrow">Patient self-service</p><h1 id="patient-portal-title">Patient portal</h1><p>Manage appointments linked to your existing medical record.</p></div>
        </div>
        <button className="workflow-button subtle" type="button" onClick={refresh} disabled={loading}>Refresh</button>
      </header>
      {error && <div className="workflow-alert error" role="alert">
        {error}{requiresPatientSignIn && <> <Link to="/PatientLogin">Sign in to the patient portal</Link>.</>}
      </div>}
      {success && <div className="workflow-alert success" role="status">{success}</div>}

      {profile && <form className="workflow-form-panel" onSubmit={saveProfile}>
        <div className="workflow-panel-heading"><div><h2>Your patient profile</h2>
          <p>Keep your health details up to date. Your profile is linked to your verified account email. PAN and Aadhaar are optional, encrypted when saved, and shown only in masked form; leave them blank to keep existing values.</p></div></div>
        <div className="patient-portal-profile">
          <strong>{profile.patientName}</strong><span>Patient ID: {profile.patientId}</span>
        </div>
        <div className="workflow-form-grid">
          <label>Age<input type="number" min="0" max="150" step="1" required value={profileForm.patientAge}
            onChange={(event) => setProfileForm({ ...profileForm, patientAge: event.target.value })} /></label>
          <label>Gender<select required value={profileForm.gender}
            onChange={(event) => setProfileForm({ ...profileForm, gender: event.target.value })}>
            <option value="">Select gender</option><option value="Female">Female</option>
            <option value="Male">Male</option><option value="Other">Other</option>
            <option value="Prefer not to say">Prefer not to say</option>
          </select></label>
          <label>Date of birth<input type="date" required max={localDate(new Date())}
            value={profileForm.dateOfBirth}
            onChange={(event) => setProfileForm({ ...profileForm, dateOfBirth: event.target.value })} /></label>
          <label className="workflow-form-wide">Address<textarea rows="3" required value={profileForm.patientAddress}
            onChange={(event) => setProfileForm({ ...profileForm, patientAddress: event.target.value })} /></label>
          <label>PAN (optional)<input type="text" autoComplete="off" maxLength="10"
            pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" title="Enter PAN in the format ABCDE1234F"
            placeholder={profile.patientPanMasked ? `Saved ${profile.patientPanMasked}; leave blank to keep it` : 'ABCDE1234F'}
            value={profileForm.patientPan}
            onChange={(event) => setProfileForm({ ...profileForm, patientPan: event.target.value })} /></label>
          <label>Aadhaar number (optional)<input type="text" inputMode="numeric" autoComplete="off" maxLength="14"
            pattern="[0-9 -]{12,14}" title="Enter a 12-digit Aadhaar number"
            placeholder={profile.patientAadhaarMasked ? `Saved ${profile.patientAadhaarMasked}; leave blank to keep it` : '12-digit Aadhaar number'}
            value={profileForm.patientAadhaar}
            onChange={(event) => setProfileForm({ ...profileForm, patientAadhaar: event.target.value })} /></label>
          <label>Postal code (optional)<input type="text" inputMode="numeric" autoComplete="postal-code"
            maxLength="6" pattern="[1-9][0-9]{5}" title="Enter a valid 6-digit Indian PIN code"
            value={profileForm.patientPostalCode || profile.patientPostalCode || ''}
            onChange={(event) => setProfileForm({ ...profileForm, patientPostalCode: event.target.value })} /></label>
        </div>
        <div className="workflow-form-actions">
          <button className="workflow-button primary" type="submit" disabled={busy || loading}>
            {busy ? 'Saving details…' : 'Save patient details'}
          </button>
        </div>
      </form>}

      <form className="workflow-form-panel" onSubmit={bookAppointment}>
        <div className="workflow-panel-heading"><div><h2>Book an appointment</h2><p>You can book directly without saving profile details first. Patient name is required for every booking. Choose an available doctor and time; pay any outstanding fee online or at reception.</p></div></div>
        <div className="workflow-form-grid">
          <label className="workflow-form-wide">Book for
            <select value={patientMode} disabled={busy} onChange={(event) => {
              setPatientMode(event.target.value);
              setPatientLookupMode('name');
              setPatientLookup({ name: '', mobile: '' });
              setPatientMatches([]);
              setHasSearchedPatients(false);
              setSelectedPatient(null);
              setNewPatient(emptyNewPatient);
            }}>
              <option value="self">Myself — {profile?.patientName || 'signed-in patient'}</option>
              <option value="existing">An existing patient</option>
              <option value="new">A new patient</option>
            </select>
          </label>
          {patientMode === 'self' && <>
            <label className="workflow-form-wide">Patient name<input required value={selfPatientName}
              readOnly={Boolean(profile?.patientName)}
              onChange={(event) => setSelfPatientName(event.target.value)} /></label>
            <p className="workflow-form-wide">This appointment will be linked to your Patient ID: <strong>{profile?.patientId || 'Loading…'}</strong></p>
          </>}
          {patientMode === 'existing' && <>
            <div className="workflow-form-wide">
              <p>Search by name, or narrow the results with the patient's mobile number. Enter the full mobile number before booking to verify the selected patient.</p>
              <label className="workflow-patient-search-mode">Search method
                <select value={patientLookupMode} onChange={(event) => {
                  setPatientLookupMode(event.target.value);
                  setPatientMatches([]);
                  setHasSearchedPatients(false);
                  setSelectedPatient(null);
                }}>
                  <option value="name">Name only</option>
                  <option value="name-mobile">Name and mobile number</option>
                </select>
              </label>
              <div className="workflow-patient-lookup">
                <label>Patient name<input required minLength="2" value={patientLookup.name}
                  onChange={(event) => {
                    setPatientLookup({ ...patientLookup, name: event.target.value });
                    setPatientMatches([]);
                    setHasSearchedPatients(false);
                    setSelectedPatient(null);
                  }} /></label>
                <label>Mobile number{patientLookupMode === 'name-mobile' && ' (required for search)'}<input type="tel" autoComplete="tel" value={patientLookup.mobile}
                  onChange={(event) => {
                    setPatientLookup({ ...patientLookup, mobile: event.target.value });
                    if (patientLookupMode === 'name-mobile') {
                      setPatientMatches([]);
                      setHasSearchedPatients(false);
                      setSelectedPatient(null);
                    }
                  }} /></label>
                <button className="workflow-button subtle" type="button" disabled={searchingPatients || busy}
                  onClick={searchExistingPatients}>{searchingPatients ? 'Searching…' : 'Find patient'}</button>
              </div>
            </div>
            <label className="workflow-form-wide">Selected patient name<input required readOnly
              value={selectedPatient?.patientName || ''} /></label>
            {patientMatches.length > 0 && <fieldset className="workflow-form-wide workflow-patient-matches">
              <legend>Select the matching patient</legend>
              {patientMatches.map((patient) => <label key={patient.patientId}>
                <input type="radio" name="existing-patient" checked={selectedPatient?.patientId === patient.patientId}
                  onChange={() => setSelectedPatient(patient)} />
                <span><strong>{patient.patientName}</strong> · {patient.patientId}<small>Mobile {patient.maskedMobile}</small></span>
              </label>)}
            </fieldset>}
            {hasSearchedPatients && patientMatches.length === 0
              && !searchingPatients && <p className="workflow-form-wide" role="status">
                No matching patient found{patientLookupMode === 'name-mobile' || patientLookup.mobile.trim() ? ' for those details' : ''}. If this is a new patient, choose “A new patient”.
              </p>}
            {selectedPatient && !patientLookup.mobile.trim()
              && <p className="workflow-form-wide" role="status">Enter the selected patient’s full mobile number to verify their record before booking.</p>}
          </>}
          {patientMode === 'new' && <>
            <p className="workflow-form-wide">Enter the new patient’s details. They will receive a separate Patient ID; this will not change your signed-in profile.</p>
            <label>Patient name<input required value={newPatient.patientName}
              onChange={(event) => setNewPatient({ ...newPatient, patientName: event.target.value })} /></label>
            <label>Age<input required type="number" min="0" max="120" step="1" value={newPatient.patientAge}
              onChange={(event) => setNewPatient({ ...newPatient, patientAge: event.target.value })} /></label>
            <label>Date of birth<input type="date" max={localDate(new Date())}
              value={newPatient.patientDateOfBirth}
              onChange={(event) => setNewPatient({ ...newPatient, patientDateOfBirth: event.target.value })} /></label>
            <label>Gender<select required value={newPatient.gender}
              onChange={(event) => setNewPatient({ ...newPatient, gender: event.target.value })}>
              <option value="">Select gender</option><option value="Female">Female</option>
              <option value="Male">Male</option><option value="Other">Other</option>
            </select></label>
            <label>Mobile number<input required type="tel" autoComplete="tel" value={newPatient.mobileNo}
              onChange={(event) => setNewPatient({ ...newPatient, mobileNo: event.target.value })} /></label>
            <label className="workflow-form-wide">Address<textarea rows="2" value={newPatient.patientAddress}
              onChange={(event) => setNewPatient({ ...newPatient, patientAddress: event.target.value })} /></label>
            <label>Postal code<input type="text" inputMode="numeric" autoComplete="postal-code"
              maxLength="6" pattern="[1-9][0-9]{5}" title="Enter a valid 6-digit Indian PIN code"
              value={newPatient.patientPostalCode}
              onChange={(event) => setNewPatient({ ...newPatient, patientPostalCode: event.target.value })} /></label>
            <label>PAN (optional)<input type="text" autoComplete="off" maxLength="10"
              pattern="[A-Za-z]{5}[0-9]{4}[A-Za-z]" title="Enter PAN in the format ABCDE1234F"
              value={newPatient.patientPan}
              onChange={(event) => setNewPatient({ ...newPatient, patientPan: event.target.value })} /></label>
            <label>Aadhaar number (optional)<input type="text" inputMode="numeric" autoComplete="off" maxLength="14"
              pattern="[0-9 -]{12,14}" title="Enter a 12-digit Aadhaar number"
              value={newPatient.patientAadhaar}
              onChange={(event) => setNewPatient({ ...newPatient, patientAadhaar: event.target.value })} /></label>
          </>}
          <label>Doctor<select required value={form.doctorId} onChange={(event) => {
            const doctor = doctors.find((entry) => entry.id === event.target.value);
            setForm({ ...form, doctorId: event.target.value, doctor: doctor?.doctorName || '', time: '' });
          }}><option value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctorOptionLabel(doctor)}</option>)}</select></label>
          {selectedDoctor && <div className="workflow-form-wide patient-portal-doctor-summary" aria-live="polite">
            <strong>{selectedDoctor.doctorName}</strong>
            <span>Specialty: {selectedDoctor.doctorSpecialistName || 'Not assigned'}</span>
            <span>Department / ward: {doctorDepartment(selectedDoctor) || 'Not assigned'}</span>
          </div>}
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
          <thead><tr><th>Appointment ID</th><th>Token number</th><th>Date</th><th>Time</th><th>Doctor</th><th>Reason</th><th>Payment</th><th>Status</th><th>Confirmation</th></tr></thead>
          <tbody>{appointments.map((appointment) => {
            const confirmed = appointment.appointmentStatus?.toLowerCase() === 'confirmed';
            const paymentStatus = Number(appointment.balanceDue || 0) > 0
              ? `Balance due ₹${Number(appointment.balanceDue).toLocaleString('en-IN')}`
              : appointment.billingStatus === 'NO_CHARGE' ? 'No charge'
                : appointment.invoiceId ? 'Paid' : confirmed ? 'Confirmed' : 'Payment pending';
            const canPayOnline = appointment.invoiceId
              && Number(appointment.balanceDue || 0) > 0
              && paymentGateways.RAZORPAY === true;
            return <tr key={appointment.id}>
              <td>{appointment.appointmentNumber || 'Legacy booking'}</td>
              <td>{appointment.tokenNumber ? String(appointment.tokenNumber).padStart(3, '0') : '—'}</td>
              <td>{appointment.date}</td><td>{appointment.time}</td><td>{appointment.doctor}</td>
              <td>{appointment.reason || '—'}</td><td>{paymentStatus}{canPayOnline && <div>
                <button className="workflow-button subtle" type="button"
                  disabled={Boolean(paymentBusyId)}
                  onClick={() => payAppointmentOnline(appointment)}>
                  {paymentBusyId === appointment.id ? 'Payment in progress…' : 'Pay online'}
                </button>
                <small className="patient-portal-payment-note">
                  UPI (Google Pay, Paytm) and other methods, if available in checkout.
                </small>
              </div>}</td>
              <td>{appointment.appointmentStatus}</td>
              <td>{confirmed && <button className="workflow-button subtle patient-confirmation-download" type="button"
                onClick={() => downloadConfirmation(appointment)}>Download confirmation</button>}</td>
            </tr>;
          })}</tbody>
        </table></div>}
        {!loading && paymentGateways.RAZORPAY !== true && <p className="patient-portal-payment-note" role="status">
          {paymentGatewayError
            ? `Online payment options could not be loaded. Please pay at reception. (${paymentGatewayError})`
            : 'Online payment is currently unavailable. Please pay any outstanding balance at reception.'}
        </p>}
      </section>
    </section>
  );
}
