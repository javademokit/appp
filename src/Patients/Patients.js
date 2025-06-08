import React, { useEffect, useState } from 'react';
// import './Patient.css'; // optional styling

const NurseDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    medicineGiven: false,
    weight: '',
    bloodPressure: '',
    note: '',
  });

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const response = await fetch('http://localhost:7771/api/patients');
      const data = await response.json();
      setPatients(data);
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-IN');
  };

  const filteredPatients = patients.filter(p =>
    (p.patientName?.toLowerCase().includes(search.toLowerCase()) ||
      p.patientEmailId?.toLowerCase().includes(search.toLowerCase()) ||
      p.patientmobileNo?.toLowerCase().includes(search.toLowerCase()))
  );

  const handleOpenForm = (patientId) => {
    const today = new Date().toISOString().split('T')[0];
    setFormData({ date: today, medicineGiven: false, weight: '', bloodPressure: '', note: '' });
    setSelectedPatientId(patientId);
  };

  const handleCloseForm = () => {
    setSelectedPatientId(null);
    setFormData({ date: '', medicineGiven: false, weight: '', bloodPressure: '', note: '' });
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const updatePayload = { patientId: selectedPatientId, ...formData };

    try {
      const res = await fetch('http://localhost:7771/api/daily-updates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload),
      });

      if (res.ok) {
        alert('Daily update submitted!');
        handleCloseForm();
      } else {
        alert('Failed to submit update.');
      }
    } catch (err) {
      console.error('Submit error:', err);
      alert('Server error');
    }
  };

  return (
    <div className="container">
      <h2>🧑‍⚕️ Nurse Dashboard – Patient Care Instructions</h2>

      <input
        type="text"
        className="search-input"
        placeholder="🔍 Search by name, email, or mobile..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading ? (
        <p>Loading patients...</p>
      ) : (
        <div className="patient-list">
          {filteredPatients.map((p, i) => (
            <div
              key={i}
              className="patient-card clickable"
              onClick={() => handleOpenForm(p.patientId)}
            >
              <h3>👤 {p.patientName} (ID: {p.patientId})</h3>
              <p><strong>📧 Email:</strong> {p.patientEmailId}</p>
              <p><strong>📞 Mobile:</strong> {p.patientmobileNo}</p>
              <p><strong>🏠 Address:</strong> {p.patientAddress}</p>
              <p><strong>🏥 Ward No:</strong> {p.patientWardnum}</p>
              <p><strong>📅 Admit Date:</strong> {formatDate(p.patientAdmitdate)}</p>
              <p><strong>📅 Discharge Date:</strong> {formatDate(p.patientDischargedate)}</p>
              <p><strong>🧑‍⚕️ Assigned Nurse:</strong> {p.patientNurseassign}</p>
              <p><strong>💊 Doctor's Instructions:</strong> {p.treatmentInstructions || p.patientPrescription || 'No instructions given yet.'}</p>
            </div>
          ))}
        </div>
      )}

      {/* Daily Update Form Modal */}
      {selectedPatientId && (
        <div className="modal">
          <div className="modal-content">
            <h3>📅 Daily Update for Patient ID: {selectedPatientId}</h3>
            <form onSubmit={handleSubmit}>
              <label>Date:
                <input type="date" name="date" value={formData.date} onChange={handleFormChange} required />
              </label>
              <label>Medicine Given:
                <input type="checkbox" name="medicineGiven" checked={formData.medicineGiven} onChange={handleFormChange} />
              </label>
              <label>Weight (kg):
                <input type="number" name="weight" value={formData.weight} onChange={handleFormChange} />
              </label>
              <label>Blood Pressure:
                <input type="text" name="bloodPressure" value={formData.bloodPressure} onChange={handleFormChange} />
              </label>
              <label>Notes:
                <textarea name="note" value={formData.note} onChange={handleFormChange} />
              </label>
              <button type="submit">Submit Update</button>
              <button type="button" onClick={handleCloseForm}>Cancel</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default NurseDashboard;
