import React, { useEffect, useState } from 'react';
import { fetchNurses, assignNurse } from '../services/api';

const NurseScheduling = () => {
  const [nurses, setNurses] = useState([]);
  const [assignment, setAssignment] = useState({ nurseId: '', ward: '', patient: '' });

  useEffect(() => {
    fetchNurses().then(res => setNurses(res.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    await assignNurse(assignment);
    alert('Nurse assigned successfully');
    setAssignment({ nurseId: '', ward: '', patient: '' });
  };

  return (
    <div>
      <h2>🧑‍⚕️ Nurse Scheduling</h2>
      <form onSubmit={handleSubmit}>
        <select onChange={(e) => setAssignment({ ...assignment, nurseId: e.target.value })}>
          <option>Select Nurse</option>
          {nurses.map(n => <option key={n.id} value={n.id}>{n.name}</option>)}
        </select>
        <input placeholder="Ward Name" onChange={(e) => setAssignment({ ...assignment, ward: e.target.value })} />
        <input placeholder="Patient Name" onChange={(e) => setAssignment({ ...assignment, patient: e.target.value })} />
        <button type="submit">Assign</button>
      </form>
    </div>
  );
};

export default NurseScheduling;
