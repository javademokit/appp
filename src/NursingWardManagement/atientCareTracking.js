import React, { useState } from 'react';
import { logPatientCare } from '../services/api';

const PatientCareTracking = () => {
  const [log, setLog] = useState({ patient: '', medication: '', vitals: '', notes: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await logPatientCare(log);
    alert('Care log submitted');
    setLog({ patient: '', medication: '', vitals: '', notes: '' });
  };

  return (
    <div>
      <h2>💊 Patient Care Tracking</h2>
      <form onSubmit={handleSubmit}>
        <input placeholder="Patient Name" value={log.patient} onChange={(e) => setLog({ ...log, patient: e.target.value })} />
        <input placeholder="Medication Given" value={log.medication} onChange={(e) => setLog({ ...log, medication: e.target.value })} />
        <input placeholder="Vitals" value={log.vitals} onChange={(e) => setLog({ ...log, vitals: e.target.value })} />
        <textarea placeholder="Notes" value={log.notes} onChange={(e) => setLog({ ...log, notes: e.target.value })}></textarea>
        <button type="submit">Submit Log</button>
      </form>
    </div>
  );
};

export default PatientCareTracking;
