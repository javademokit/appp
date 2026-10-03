import React, { useState, useEffect } from 'react';
import './BookAppointment.css';
import { apiFetch } from '../API/api';
import {
  FaUser,
  FaUserMd,
  FaCalendarAlt,
  FaClock,
  FaNotesMedical,
  FaRupeeSign,
  FaPrint,
} from 'react-icons/fa';

const formatLocalDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const normalizeMobile = (mobile) => String(mobile || '').replace(/\D/g, '');
const parseAppointmentDate = (date) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date || ''));
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
};

const BookAppointment = () => {
  const newPatientOption = 'NEW';
  const followUpWindowDays = 15;
  const minimumDate = formatLocalDate(new Date());
  const [form, setForm] = useState({
    patientName: '',
    gender: '',
    patientAge: '',
    mobileNo: '',
    patientEmailId: '',
    patientAddress: '',
    doctorId: '',
    doctor: '',
    date: '',
    time: '',
    reason: '',
    fee: '',
  });

  const [report, setReport] = useState(null);
  const [bookingTime, setBookingTime] = useState('');
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [selectedPatientId, setSelectedPatientId] = useState(newPatientOption);
  const [mobileSearch, setMobileSearch] = useState('');
  const [mobileSearchResults, setMobileSearchResults] = useState(null);
  const [availableTimes, setAvailableTimes] = useState([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [loadingDirectories, setLoadingDirectories] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [requiresReload, setRequiresReload] = useState(false);

  useEffect(() => {
    const fetchDirectories = async () => {
      try {
        const [doctorResponse, patientResponse, appointmentResponse] = await Promise.all([
          apiFetch('/doctors'),
          apiFetch('/patients'),
          apiFetch('/appointments1'),
        ]);
        if (!doctorResponse.ok || !patientResponse.ok || !appointmentResponse.ok) {
          throw new Error('Could not load patient, doctor, and appointment records. Please refresh and try again.');
        }
        const [doctorData, patientData, appointmentData] = await Promise.all([
          doctorResponse.json(),
          patientResponse.json(),
          appointmentResponse.json(),
        ]);
        if (!Array.isArray(doctorData) || !Array.isArray(patientData) || !Array.isArray(appointmentData)) {
          throw new Error('Patient, doctor, or appointment service returned invalid records.');
        }
        setDoctors(doctorData.filter((doctor) => doctor.doctorName));
        setPatients(patientData.filter((patient) => patient.patientId));
        setAppointments(appointmentData);
      } catch (error) {
        setError(error.message || 'Could not load patient and doctor records.');
      } finally {
        setLoadingDirectories(false);
      }
    };

    fetchDirectories();
  }, []);

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
      setError('');
      try {
        const query = new URLSearchParams({ doctorId: form.doctorId, date: form.date });
        const response = await apiFetch(`/appointments1/availability?${query}`);
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || data.detail
            || `Could not check appointment availability (${response.status}).`);
        }
        if (!Array.isArray(data)) throw new Error('Appointment availability returned an invalid response.');
        if (active) setAvailableTimes(data);
      } catch (requestError) {
        if (active) setError(requestError.message || 'Could not check appointment availability.');
      } finally {
        if (active) setLoadingAvailability(false);
      }
    };

    loadAvailability();
    return () => { active = false; };
  }, [form.doctorId, form.date]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'doctor') {
      const selectedDoctor = doctors.find((d) => d.id === value);
      if (selectedDoctor) {
        setForm({ ...form, doctorId: value, doctor: selectedDoctor.doctorName, fee: selectedDoctor.doctorfee, time: '' });
      } else {
        setForm({ ...form, doctorId: '', doctor: '', fee: '', time: '' });
        setAvailableTimes([]);
      }
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const searchPatientsByMobile = () => {
    const searchedMobile = normalizeMobile(mobileSearch);
    if (!searchedMobile) {
      setMobileSearchResults([]);
      return;
    }

    const matches = patients.filter((patient) =>
      normalizeMobile(patient.patientmobileNo || patient.mobileNo) === searchedMobile
    );
    setSelectedPatientId(matches.length === 1 ? matches[0].patientId : newPatientOption);
    setMobileSearchResults(matches.length === 1 ? null : matches);
  };

  const selectPatient = (patient) => {
    setSelectedPatientId(patient.patientId);
    setMobileSearchResults(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const patientId = selectedPatientId === newPatientOption ? '' : selectedPatientId;
      const appointmentFee = selectedPatient && feeDetails.isFollowUp ? 0 : form.fee;
      const response = await apiFetch('/appointments1', {
        method: 'POST',
        body: JSON.stringify({ ...form, fee: appointmentFee, patientId: patientId || undefined }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const serverMessage = data.message || data.detail
          || (data.title && data.title !== 'Conflict' ? data.title : '')
          || (data.error && data.error !== 'Conflict' ? data.error : '');
        const statusMessage = response.status === 409
          ? 'The appointment conflicts with an existing booking or patient record. Please choose another time or verify the patient details.'
          : response.status === 401
            ? 'Your session has expired. Sign in again, then retry the appointment.'
            : response.status === 403
              ? 'Your account is not allowed to book appointments. Contact an administrator.'
              : `Appointment could not be booked (${response.status}).`;
        throw new Error(serverMessage || statusMessage);
      }
      if (!data.patientId) {
        setRequiresReload(true);
        throw new Error('The server saved the appointment without returning a Patient ID. Do not submit again; contact support and reload after reconciliation.');
      }
      setBookingTime(new Date().toLocaleString());
      setReport(data);
      setAppointments((current) => (
        data.id && current.some((appointment) => appointment.id === data.id)
          ? current
          : [data, ...current]
      ));
      setSelectedPatientId(newPatientOption);
      setMobileSearch('');
      setMobileSearchResults(null);
      setForm({
        patientName: '', gender: '', patientAge: '', mobileNo: '', patientEmailId: '',
        patientAddress: '', doctorId: '', doctor: '', date: '', time: '', reason: '', fee: '',
      });
      setAvailableTimes([]);
    } catch (error) {
      setError(error.message || 'Appointment could not be booked.');
      if (error.message === 'Selected appointment slot is already booked') {
        setForm((current) => ({ ...current, time: '' }));
      }
    } finally {
      setBusy(false);
    }
  };

  const selectedPatient = patients.find((patient) => patient.patientId === selectedPatientId);
  const patientAppointmentHistory = selectedPatient
    ? appointments.filter((appointment) => appointment.patientId
      ? appointment.patientId === selectedPatient.patientId
      : (normalizeMobile(appointment.mobileNo || appointment.patientmobileNo)
        && normalizeMobile(appointment.mobileNo || appointment.patientmobileNo)
          === normalizeMobile(selectedPatient.patientmobileNo || selectedPatient.mobileNo)))
    : [];
  const latestPastAppointment = patientAppointmentHistory
    .filter((appointment) => appointment.appointmentStatus !== 'cancelled')
    .map((appointment) => ({ appointment, date: parseAppointmentDate(appointment.date) }))
    .filter(({ date }) => date && date <= new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()))
    .sort((a, b) => b.date - a.date)[0];
  const daysSinceLastAppointment = latestPastAppointment
    ? Math.floor((new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) - latestPastAppointment.date) / 86400000)
    : null;
  const feeDetails = {
    isFollowUp: daysSinceLastAppointment !== null && daysSinceLastAppointment <= followUpWindowDays,
    daysSinceLastAppointment,
  };
  const displayedFee = selectedPatient && feeDetails.isFollowUp ? 0 : form.fee;

  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);

  const handlePrint = () => {
    const printContent = document.getElementById('appointment-report');
    const newWin = window.open('', '_blank');
    if (!newWin || !printContent) {
      setError('Allow pop-ups to print the appointment receipt.');
      return;
    }

    newWin.document.write(`
      <html>
        <head>
          <title>Appointment Report</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h2, h4 { text-align: center; margin: 5px 0; }
            p { text-align: center; margin: 2px 0; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #333; padding: 10px; text-align: center; }
            .signature-block { margin-top: 40px; text-align: right; font-size: 14px; }
            .signature-block p { margin: 4px 0; }
            .close-btn {
              display: block;
              margin: 30px auto 0;
              padding: 10px 20px;
              font-size: 16px;
              background-color: #f44336;
              color: white;
              border: none;
              cursor: pointer;
            }
          </style>
        </head>
        <body>
          <h2>Wellness Hospital</h2>
          <h4>Appointment Receipt</h4>
          <table>
            <tbody>
              <tr><th>Appointment ID</th><td>${escapeHtml(report.id)}</td></tr>
              <tr><th>Patient ID</th><td>${escapeHtml(report.patientId)}</td></tr>
              <tr><th>Patient</th><td>${escapeHtml(report.patientName)}</td></tr>
              <tr><th>Doctor</th><td>${escapeHtml(report.doctor)}</td></tr>
              <tr><th>Date</th><td>${escapeHtml(report.date)}</td></tr>
              <tr><th>Time</th><td>${escapeHtml(report.time)}</td></tr>
              <tr><th>Reason</th><td>${escapeHtml(report.reason)}</td></tr>
              <tr><th>Fee</th><td>${escapeHtml(report.fee)}</td></tr>
            </tbody>
          </table>
          <p>Booking time: ${escapeHtml(bookingTime)}</p>
          <button class="close-btn" onclick="window.close()">Close</button>
        </body>
      </html>
    `);

    newWin.document.close();
    newWin.focus();
    newWin.print();
  };

  return (
    <div className="book-container">
      <h2 className="form-title">Book an Appointment</h2>

      {error && <div className="workflow-alert error" role="alert">{error}</div>}
      {report && <div className="workflow-alert success" role="status">Appointment booked. Patient ID: <strong>{report.patientId}</strong></div>}

      <form onSubmit={handleSubmit} className="appointment-form">
        <label className="appointment-patient-select">Patient record
          <select aria-label="Patient record" value={selectedPatientId} onChange={(event) => setSelectedPatientId(event.target.value)} disabled={loadingDirectories || busy}>
            <option value={newPatientOption}>Register a new patient</option>
            {patients.map((patient) => (
              <option key={patient.patientId} value={patient.patientId}>
                {patient.patientName} · {patient.patientId}
              </option>
            ))}
          </select>
        </label>

        <div className="appointment-mobile-search">
          <label htmlFor="patient-mobile-search">Find existing patient by mobile number</label>
          <div className="appointment-mobile-search-controls">
            <input
              id="patient-mobile-search"
              type="tel"
              autoComplete="tel"
              placeholder="Enter patient's mobile number"
              value={mobileSearch}
              onChange={(event) => {
                setMobileSearch(event.target.value);
                setMobileSearchResults(null);
              }}
              disabled={loadingDirectories || busy}
            />
            <button type="button" className="submit-btn" onClick={searchPatientsByMobile} disabled={loadingDirectories || busy}>
              Search
            </button>
          </div>
          {mobileSearchResults && (mobileSearchResults.length ? (
            <div className="appointment-mobile-search-results" aria-live="polite">
              {mobileSearchResults.map((patient) => (
                <button key={patient.patientId} type="button" onClick={() => selectPatient(patient)}>
                  {patient.patientName} · {patient.patientId}
                </button>
              ))}
            </div>
          ) : <p className="appointment-fee-note" role="status">No patient found with this mobile number. Continue as a new patient.</p>)}
        </div>

        {selectedPatient ? (
          <div className="appointment-patient-summary" aria-live="polite">
            <strong>{selectedPatient.patientName}</strong>
            <span>Patient ID: {selectedPatient.patientId}</span>
            <span>{selectedPatient.patientAge ? `${selectedPatient.patientAge} years` : 'Age not recorded'} · {selectedPatient.gender || 'Gender not recorded'}</span>
            <span>{selectedPatient.patientmobileNo || 'No phone recorded'}</span>
            {feeDetails.isFollowUp
              ? <span className="appointment-fee-note">Follow-up within {followUpWindowDays} days of the last appointment ({feeDetails.daysSinceLastAppointment} days ago): no consultation fee.</span>
              : <span className="appointment-fee-note">{feeDetails.daysSinceLastAppointment === null
                ? 'No previous appointment found. The consultation fee applies.'
                : `More than ${followUpWindowDays} days since the last appointment. The consultation fee applies.`}</span>}
          </div>
        ) : <>
        <div className="form-group">
          <FaUser className="form-icon" />
          <input
            type="text"
            name="patientName"
            placeholder="Patient Full Name"
            value={form.patientName}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <FaUser className="form-icon" />
          <select
            name="gender"
            value={form.gender}
            onChange={handleChange}
            required
          >
            <option value="">Select Gender</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>
        </div>

        <div className="form-group">
          <FaUser className="form-icon" />
          <input
            type="number"
            name="patientAge"
            placeholder="Patient Age"
            value={form.patientAge}
            onChange={handleChange}
            required
            min="0"
            max="120"
            step="1"
          />
        </div>

        <div className="form-group">
          <FaUser className="form-icon" />
          <input
            type="text"
            name="mobileNo"
            placeholder="Patient Mobile No"
            value={form.mobileNo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <FaUser className="form-icon" />
          <input
            type="email"
            name="patientEmailId"
            placeholder="Patient Email Id"
            value={form.patientEmailId}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <FaUser className="form-icon" />
          <input
            type="text"
            name="patientAddress"
            placeholder="Patient Address"
            value={form.patientAddress}
            onChange={handleChange}
          />
        </div>
        </>}

        <div className="form-group">
          <FaUserMd className="form-icon" />
          <select
            name="doctor"
            value={form.doctorId}
            onChange={handleChange}
            required
            disabled={loadingDirectories || !doctors.length}
          >
            <option value="">
              {loadingDirectories ? 'Loading doctors…' : doctors.length ? 'Select Doctor' : 'No doctors available'}
            </option>
            {doctors.map((doc) => (
              <option key={doc.id} value={doc.id}>
                {doc.doctorName}
              </option>
            ))}
          </select>
        </div>

        {form.fee && (
          <div className="form-group">
            <FaRupeeSign className="form-icon" />
            <input
              type="text"
              value={`₹${displayedFee}`}
              readOnly
              title="Doctor's Fee"
            />
          </div>
        )}

        <div className="form-group">
          <FaCalendarAlt className="form-icon" />
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            min={minimumDate}
            required
          />
        </div>

        <div className="form-group">
          <FaClock className="form-icon" />
          <select
            name="time"
            value={form.time}
            onChange={handleChange}
            required
            disabled={!form.doctorId || !form.date || loadingAvailability || !availableTimes.length}
          >
            <option value="">
              {loadingAvailability ? 'Checking availability…' : availableTimes.length ? 'Select Time Slot' : 'No available times'}
            </option>
            {(Array.isArray(availableTimes) ? availableTimes : String(availableTimes || '').split(',').map((slot) => slot.trim()).filter(Boolean)).map((slot, index) => (
              <option key={index} value={slot}>
                {slot}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <FaNotesMedical className="form-icon" />
          <textarea
            name="reason"
            placeholder="Reason for appointment"
            value={form.reason}
            onChange={handleChange}
            rows={3}
          />
        </div>

        <button type="submit" className="submit-btn" disabled={busy || loadingDirectories || loadingAvailability || !availableTimes.includes(form.time) || !doctors.length || requiresReload}>
          {busy ? 'Booking…' : loadingDirectories ? 'Loading records…' : loadingAvailability ? 'Checking availability…' : 'Book Appointment'}
        </button>
      </form>

      {report && (
        <div className="appointment-report">
          <div id="appointment-report">
            <h2>🏥 Wellness Hospital</h2>
            <p>123 Health St, Wellness City, IN</p>
            <p>📞 +91 98765 43210</p>
            <h4>🧾 Appointment Report</h4>
            <table>
              <thead>
                <tr>
                  <th>Appointment ID</th>
                  <th>Patient</th>
                  <th>Patient ID</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Reason</th>
                  <th>Fee</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>{report.id}</td>
                  <td>{report.patientName}</td>
                  <td>{report.patientId}</td>
                  <td>{report.doctor}</td>
                  <td>{report.date}</td>
                  <td>{report.time}</td>
                  <td>{report.reason}</td>
                  <td>₹{report.fee}</td>
                </tr>
              </tbody>
            </table>
            <p><strong>Booking Time:</strong> {bookingTime}</p>

            <div className="signature-block">
              <p>__________________________</p>
              <p>Authorized Signature</p>
            </div>
          </div>

          <div className="report-buttons">
            <button onClick={handlePrint} className="print-btn">
              <FaPrint /> Print Report
            </button>
            <button className="close-btn" onClick={() => setReport(null)}>
              Close Report
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookAppointment;