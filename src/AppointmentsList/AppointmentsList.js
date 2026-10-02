import React, { useEffect, useState, useCallback } from 'react';
import { FaUserInjured, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import { apiFetch } from '../API/api';
import './AppointmentsList.css';

const AppointmentsList = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('success');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const fetchAppointments = useCallback(async () => {
    try {
      const response = await apiFetch('/appointments1');
      const data = await response.json().catch(() => []);
      if (!response.ok) throw new Error(data.message || 'Could not load appointments');
      if (!Array.isArray(data)) throw new Error('Appointment service returned an invalid response');
      const sorted = data.sort((a, b) => String(a.time || '').localeCompare(String(b.time || '')));
      setAppointments(sorted);
    } catch (error) {
      setError(error.message || 'Could not load appointments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const showAlert = (message, type = 'success') => {
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);
    setTimeout(() => setShowModal(false), 3000);
  };

  const updateAppointmentStatus = async (id, action) => {
    setBusyId(id);
    setError('');
    try {
      const response = await apiFetch(`/appointments1/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: action === 'confirm' ? 'confirmed' : 'cancelled' }),
      });

      if (response.ok) {
        showAlert(`${action === 'confirm' ? 'Confirmed' : 'Cancelled'} successfully!`);
        await fetchAppointments();
      } else {
        const result = await response.json().catch(() => ({}));
        showAlert(result.message || 'Something went wrong!', 'error');
      }
    } catch (requestError) {
      showAlert(requestError.message || 'Failed to update appointment', 'error');
    } finally {
      setBusyId('');
    }
  };

  const filteredAppointments = appointments.filter((appt) =>
    `${appt.patientId || ''} ${appt.patientName || ''} ${appt.doctor || ''}`
      .toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="appointments-container">
      <div className="appointments-header">
        <h2 className="appointments-title">All Appointments</h2>
        <input
          type="text"
          placeholder="Search by patient or doctor..."
          className="appointments-search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {error && <div className="workflow-alert error" role="alert">{error}</div>}

      {loading ? (
        <div className="appointments-loading">Loading...</div>
      ) : filteredAppointments.length === 0 ? (
        <div className="appointments-empty">No appointments found.</div>
      ) : (
        <>
          {/* Desktop/Tablet Table */}
          <div className="appointments-table-container">
            <table className="appointments-table">
              <thead>
                <tr>
                  <th>Patient ID</th>
                  <th>Patient Name</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Mobile</th>
                  <th>Email</th>
                  <th>Address</th>
                  <th>Doctor</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredAppointments.map((appt) => (
                  <tr key={appt.id}>
                    <td>{appt.patientId || 'Unlinked legacy appointment'}</td>
                    <td><FaUserInjured className="icon" /> {appt.patientName || '—'}</td>
                    <td>{appt.gender}</td>
                    <td>{appt.patientAge}</td>
                    <td>{appt.mobileNo}</td>
                    <td>{appt.patientEmailId}</td>
                    <td>{appt.patientAddress}</td>
                    <td>{appt.doctor}</td>
                    <td>{appt.date}</td>
                    <td>{appt.time}</td>
                    <td>
                      {appt.appointmentStatus === 'confirmed' ? (
                        <FaCheckCircle className="icon green" />
                      ) : appt.appointmentStatus === 'cancelled' ? (
                        <FaTimesCircle className="icon red" />
                      ) : (
                        'Pending'
                      )}
                    </td>
                    <td>
                      <select
                        disabled={busyId === appt.id || ['cancelled', 'confirmed'].includes(appt.appointmentStatus)}
                        onChange={(e) => updateAppointmentStatus(appt.id, e.target.value)}
                        defaultValue=""
                        className="action-dropdown"
                      >
                        <option value="" disabled>Choose</option>
                        <option value="confirm">✅ Confirm</option>
                        <option value="cancel">🗑 Cancel</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="appointments-mobile">
            {filteredAppointments.map((appt) => (
              <div className="appointment-card" key={appt.id}>
                <div className="appointment-index">Patient ID: {appt.patientId || 'Unlinked legacy appointment'}</div>
                <div className="appointment-patient">
                  <FaUserInjured className="icon" /> {appt.patientName}
                </div>
                <div><strong>Gender:</strong> {appt.gender}</div>
                <div><strong>Age:</strong> {appt.patientAge}</div>
                <div><strong>Mobile:</strong> {appt.mobileNo}</div>
                <div><strong>Email:</strong> {appt.patientEmailId}</div>
                <div><strong>Address:</strong> {appt.patientAddress}</div>
                <div><strong>Doctor:</strong> {appt.doctor || '—'}</div>
                <div><strong>Date:</strong> {appt.date}</div>
                <div><strong>Time:</strong> {appt.time}</div>
                <div><strong>Status:</strong>
                  {appt.appointmentStatus === 'confirmed' ? (
                    <FaCheckCircle className="icon green" />
                  ) : appt.appointmentStatus === 'cancelled' ? (
                    <FaTimesCircle className="icon red" />
                  ) : (
                    'Pending'
                  )}
                </div>
                <select
                  disabled={busyId === appt.id || ['cancelled', 'confirmed'].includes(appt.appointmentStatus)}
                  onChange={(e) => updateAppointmentStatus(appt.id, e.target.value)}
                  defaultValue=""
                  className="action-dropdown"
                >
                  <option value="" disabled>Choose</option>
                  <option value="confirm">✅ Confirm</option>
                  <option value="cancel">🗑 Cancel</option>
                </select>
              </div>
            ))}
          </div>
        </>
      )}

      {showModal && (
        <div className="modal">
          <div className={`modal-content ${modalType}`}>
            {modalType === 'success' ? (
              <FaCheckCircle className="icon green" />
            ) : (
              <FaTimesCircle className="icon red" />
            )}
            <span className="modal-message">{modalMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsList;
