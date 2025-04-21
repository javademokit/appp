import React, { useState } from 'react';
import './AdmitForm.css';

const AdmitForm = () => {
  const [form, setForm] = useState({
    name: '',
    age: '',
    wardNo: '',
    roomNo: '',
    appointmentDate: '',
    dischargeDate: '',
  });

  const [patients, setPatients] = useState([]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setPatients([...patients, form]);
    setForm({
      name: '',
      age: '',
      wardNo: '',
      roomNo: '',
      appointmentDate: '',
      dischargeDate: '',
    });
  };

  return (
    <div className="container">
      <h2>🏥 Patient Admission Form</h2>

      <form onSubmit={handleSubmit} className="form">
        <input
          type="text"
          name="name"
          placeholder="Patient Name"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          type="number"
          name="age"
          placeholder="Age"
          value={form.age}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="wardNo"
          placeholder="Ward No"
          value={form.wardNo}
          onChange={handleChange}
          required
        />
        <input
          type="text"
          name="roomNo"
          placeholder="Room No"
          value={form.roomNo}
          onChange={handleChange}
          required
        />
        <label>Appointment Date:</label>
        <input
          type="date"
          name="appointmentDate"
          value={form.appointmentDate}
          onChange={handleChange}
          required
        />
        <label>Discharge Date:</label>
        <input
          type="date"
          name="dischargeDate"
          value={form.dischargeDate}
          onChange={handleChange}
          required
        />
        <button type="submit">➕ Add Patient</button>
      </form>

      <h3>📋 Admitted Patients</h3>
      {patients.length === 0 ? (
        <p>No patients admitted yet.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Age</th>
              <th>Ward</th>
              <th>Room</th>
              <th>Appointment Date</th>
              <th>Discharge Date</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((patient, index) => (
              <tr key={index}>
                <td>{patient.name}</td>
                <td>{patient.age}</td>
                <td>{patient.wardNo}</td>
                <td>{patient.roomNo}</td>
                <td>{patient.appointmentDate}</td>
                <td>{patient.dischargeDate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdmitForm;
