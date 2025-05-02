// src/Doctors/Doctors.js
import React, { useEffect, useState } from 'react';
import './Doctor.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

function Doctors() {
  const [doctors, setDoctors] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    doctorSpecialistName: '',
    doctorAvailabletime: '',
    doctorslot: '',
    doctorfee: '',
  });

  useEffect(() => {
    fetchDoctors();
  }, []);

  const fetchDoctors = async () => {
    try {
      const response = await fetch('http://localhost:7771/api/doctors/all');
      const data = await response.json();
      setDoctors(data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
    }
  };

  const handleInputChange = (e) => {
    setNewDoctor({ ...newDoctor, [e.target.name]: e.target.value });
  };

  const handleCreateDoctor = () => {
    const newEntry = {
      doctorId: doctors.length + 1, // Simple ID generation
      ...newDoctor
    };
    setDoctors([...doctors, newEntry]);
    setShowModal(false);
    setNewDoctor({
      doctorSpecialistName: '',
      doctorAvailabletime: '',
      doctorslot: '',
      doctorfee: '',
    });
  };

  return (
    <div className="container my-5 doctor-container">
      <div className="doctor-header d-flex justify-content-between align-items-center mb-4">
        <h2 className="text-center">
          <i className="bi bi-person-badge-fill doctor-icon"></i> Doctor List
        </h2>
        <button className="btn btn-primary create-btn" onClick={() => setShowModal(true)}>
          <i className="bi bi-plus-circle me-2"></i> Create
        </button>
      </div>

      <div className="table-responsive">
        <table className="table custom-table" border="1" cellPadding="8" cellSpacing="0" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>#</th>
              <th>Specialization</th>
              <th>Available Time</th>
              <th>Slots</th>
              <th>Consultation Fee</th>
            </tr>
          </thead>
          <tbody>
            {doctors.map((doc) => (
              <tr key={doc.doctorId}>
                <td>Dr. ({doc.doctorId})</td>
                <td>{doc.doctorSpecialistName}</td>
                <td>{doc.doctorAvailabletime}</td>
                <td>{doc.doctorslot} slots</td>
                <td>₹{doc.doctorfee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal Popup */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h4 className="mb-3">Add New Doctor</h4>

            <div className="mb-3">
              <label>Specialization</label>
              <input
                type="text"
                className="form-control"
                name="doctorSpecialistName"
                value={newDoctor.doctorSpecialistName}
                onChange={handleInputChange}
              />
            </div>

            <div className="mb-3">
              <label>Available Time</label>
              <input
                type="text"
                className="form-control"
                name="doctorAvailabletime"
                value={newDoctor.doctorAvailabletime}
                onChange={handleInputChange}
              />
            </div>

            <div className="mb-3">
              <label>Slots</label>
              <input
                type="number"
                className="form-control"
                name="doctorslot"
                value={newDoctor.doctorslot}
                onChange={handleInputChange}
              />
            </div>

            <div className="mb-3">
              <label>Consultation Fee (₹)</label>
              <input
                type="number"
                className="form-control"
                name="doctorfee"
                value={newDoctor.doctorfee}
                onChange={handleInputChange}
              />
            </div>

            <div className="d-flex justify-content-end">
              <button className="btn btn-secondary me-2" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-success" onClick={handleCreateDoctor}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Doctors;