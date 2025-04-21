import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import {
  FaUserInjured,
  FaCheckCircle,
  FaTimesCircle,
} from 'react-icons/fa';
import './AppointmentsList.css';

const AppointmentsList = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchAppointments = useCallback(async () => {
    try {
      const response = await axios.get(`http://localhost:7771/api/appointments?date=${today}`);
      const sorted = response.data.sort((a, b) => a.time.localeCompare(b.time));
      setAppointments(sorted);
    } catch (error) {
      console.error('Error fetching appointments:', error);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const updateAppointmentStatus = async (id, action) => {
    try {
      await axios.patch(`http://localhost:7771/api/appointments/${id}`, {
        status: action === 'confirm' ? 'confirmed' : 'cancelled',
      });

      fetchAppointments();
    } catch (err) {
      alert('Failed to update appointment');
    }
  };

  return (
    <div className="appointments-container">
      <h2 className="appointments-title">📅 Today's Appointments</h2>

      {loading ? (
        <div className="appointments-loading">Loading...</div>
      ) : appointments.length === 0 ? (
        <div className="appointments-empty">No appointments for today.</div>
      ) : (
        <div className="appointments-table-container">
          <table className="appointments-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Time</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {appointments.map((appt, index) => (
                <tr key={appt.id}>
                  <td>{index + 1}</td>
                  <td className="patient-name">
                    <FaUserInjured className="icon" /> {appt.patientName}
                  </td>
                  <td>{appt.doctorName}</td>
                  <td>{appt.time}</td>
                  <td>
                    {appt.confirmed ? (
                      <FaCheckCircle className="icon green" />
                    ) : (
                      <FaTimesCircle className="icon red" />
                    )}
                  </td>
                  <td>
                    <select
                      onChange={(e) =>
                        updateAppointmentStatus(appt.id, e.target.value)
                      }
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
    </div>
  );
};

export default AppointmentsList;
