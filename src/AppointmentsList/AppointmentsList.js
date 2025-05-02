import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { FaUserInjured, FaCheckCircle, FaTimesCircle } from 'react-icons/fa';
import './AppointmentsList.css';

const AppointmentsList = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false); // Modal visibility state
  const [modalMessage, setModalMessage] = useState('');
  const [modalType, setModalType] = useState('success'); // success or error

  const fetchAppointments = useCallback(async () => {
    try {
      const response = await axios.get('http://localhost:7771/api/appointments1');
      const sorted = response.data.sort((a, b) => a.time.localeCompare(b.time));
      setAppointments(sorted);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Show custom modal with message
  const showAlert = (message, type = 'success') => {
    setModalMessage(message);
    setModalType(type);
    setShowModal(true);

    setTimeout(() => {
      setShowModal(false); // Hide modal after 3 seconds
    }, 3000);
  };

  // Update appointment status
  const updateAppointmentStatus = async (id, action) => {
    try {
      const response = await axios.patch(`http://localhost:7771/api/appointments1/${id}`, {
        status: action === 'confirm' ? 'confirmed' : 'cancelled',
      });

      if (response.status === 200) {
        showAlert(`${action === 'confirm' ? 'Confirmed' : 'Cancelled'} successfully!`, 'success');
        fetchAppointments();
      } else {
        showAlert('Something went wrong!', 'error');
      }
    } catch (err) {
      showAlert('Failed to update appointment', 'error');
    }
  };

  return (
    <div className="appointments-container">
      <h2 className="appointments-title">📋 All Appointments</h2>

      {loading ? (
        <div className="appointments-loading">Loading...</div>
      ) : appointments.length === 0 ? (
        <div className="appointments-empty">No appointments available.</div>
      ) : (
        <div className="appointments-table-container">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>AId</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
                <th>Appointment Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt) => (
                <tr key={appt.id}>
                  <td>{appt.id}</td>
                  <td >
                    <FaUserInjured className="icon" /> {appt.patientName}
                  </td>
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
                      onChange={(e) => updateAppointmentStatus(appt.id, e.target.value)} 
                      defaultValue=""
                      className="action-dropdown"
                    >
                      <option value="" disabled>
                        Choose
                      </option>
                      <option value="confirm">✅ Confirm</option>
                      <option value="cancel">🗑 Cancel</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Custom Modal - Alert Box */}
      {showModal && (
        <div className="modal">
          <div className={`modal-content ${modalType}`}>
            <div className="modal-icon">
              {modalType === 'success' ? (
                <FaCheckCircle className="icon green" />
              ) : (
                <FaTimesCircle className="icon red" />
              )}
            </div>
            <div className="modal-message">{modalMessage}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsList;
