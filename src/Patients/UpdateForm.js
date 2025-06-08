import React, { useState, useEffect } from 'react';

const UpdateForm = ({ patientId, onClose }) => {
  const [date, setDate] = useState('');
  const [medicineGiven, setMedicineGiven] = useState(false);
  const [weight, setWeight] = useState('');
  const [bloodPressure, setBloodPressure] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setDate(today);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const update = {
      patientId,
      date,
      medicineGiven,
      weight,
      bloodPressure,
      note,
    };

    const res = await fetch('http://localhost:7771/api/daily-updates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });

    if (res.ok) {
      alert('Update submitted');
      onClose();
    } else {
      alert('Error submitting update');
    }
  };

  return (
    <div className="modal">
      <h3>Update for Patient ID: {patientId}</h3>
      <form onSubmit={handleSubmit}>
        <label>Date: <input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
        <label>Medicine Given: <input type="checkbox" checked={medicineGiven} onChange={(e) => setMedicineGiven(e.target.checked)} /></label>
        <label>Weight (kg): <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
        <label>Blood Pressure: <input type="text" value={bloodPressure} onChange={(e) => setBloodPressure(e.target.value)} /></label>
        <label>Note: <textarea value={note} onChange={(e) => setNote(e.target.value)} /></label>
        <button type="submit">Submit</button>
        <button type="button" onClick={onClose}>Close</button>
      </form>
    </div>
  );
};

export default UpdateForm;
