import React, { useEffect, useState } from 'react';
import { getCareLogs } from '../services/api';

const NurseReporting = () => {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    getCareLogs().then(res => setLogs(res.data));
  }, []);

  return (
    <div>
      <h2>📝 Nurse Activity Reporting</h2>
      <table>
        <thead>
          <tr><th>Patient</th><th>Medication</th><th>Vitals</th><th>Notes</th><th>Time</th></tr>
        </thead>
        <tbody>
          {logs.map((l, idx) => (
            <tr key={idx}>
              <td>{l.patient}</td>
              <td>{l.medication}</td>
              <td>{l.vitals}</td>
              <td>{l.notes}</td>
              <td>{new Date(l.time).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default NurseReporting;
