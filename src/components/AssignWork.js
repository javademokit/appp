import React, { useState, useEffect } from 'react';

const wards = ['Ward A', 'Ward B', 'Ward C', 'ICU', 'General'];

const AssignWork = () => {
  const [nurses, setNurses] = useState([]);
  const [assignments, setAssignments] = useState([]);

  const [selected, setSelected] = useState({
    nurseId: '',
    ward: '',
    room: '',
  });

  // Fetch nurse list on mount
  useEffect(() => {
    const fetchNurses = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/nurses');
        const data = await response.json();
        setNurses(data);
      } catch (error) {
        console.error('Error fetching nurses:', error);
        alert('❌ Could not load nurse list.');
      }
    };

    fetchNurses();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setSelected((prev) => ({ ...prev, [name]: value }));
  };

  const handleAssign = async () => {
    if (!selected.nurseId || !selected.ward || !selected.room) {
      return alert('Please fill all fields');
    }

    const nurse = nurses.find((n) => n.id === parseInt(selected.nurseId));
    const newAssignment = {
      nurseId: nurse.id,
      nurseName: nurse.name,
      ward: selected.ward,
      room: selected.room,
    };

    try {
      const response = await fetch(`http://localhost:3001/api/nurses/${nurse.id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ward: selected.ward,
          room: selected.room,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to assign work');
      }

      setAssignments((prev) => [...prev, newAssignment]);
      setSelected({ nurseId: '', ward: '', room: '' });
      alert(`✅ Assignment successful for ${nurse.name}`);
    } catch (error) {
      console.error('Assignment failed:', error);
      alert('❌ Could not assign work.');
    }
  };

  return (
    <div className="assign-work-container">
      <h2>📝 Assign Nurse to Ward & Room</h2>

      <select name="nurseId" value={selected.nurseId} onChange={handleChange}>
        <option value="">Select Nurse</option>
        {nurses.map((n) => (
          <option key={n.id} value={n.id}>{n.name}</option>
        ))}
      </select>

      <select name="ward" value={selected.ward} onChange={handleChange}>
        <option value="">Select Ward</option>
        {wards.map((ward) => (
          <option key={ward} value={ward}>{ward}</option>
        ))}
      </select>

      <input
        name="room"
        placeholder="Room Number"
        value={selected.room}
        onChange={handleChange}
        type="text"
      />

      <button onClick={handleAssign}>Assign</button>

      <h3>📋 Assignment Log</h3>
      <ul>
        {assignments.map((a, index) => (
          <li key={index}>
            🧑‍⚕️ {a.nurseName} ➜ {a.ward}, Room {a.room}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default AssignWork;
