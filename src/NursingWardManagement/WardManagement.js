import React, { useEffect, useState } from 'react';
import { fetchWards } from '../services/api';

const WardManagement = () => {
  const [wards, setWards] = useState([]);

  useEffect(() => {
    fetchWards().then(res => setWards(res.data));
  }, []);

  return (
    <div>
      <h2>🏥 Ward Management</h2>
      <table>
        <thead>
          <tr><th>Ward</th><th>Room</th><th>Status</th></tr>
        </thead>
        <tbody>
          {wards.map((ward, idx) => (
            <tr key={idx}>
              <td>{ward.name}</td>
              <td>{ward.roomNumber}</td>
              <td>{ward.occupied ? 'Occupied' : 'Available'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default WardManagement;
