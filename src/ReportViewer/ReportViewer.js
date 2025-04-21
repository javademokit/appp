import React, { useState } from 'react';
import './ReportViewer.css';

const mockData = {
  'Appointments Report': [
    { id: 1, patient: 'John Doe', doctor: 'Dr. Smith', date: '2025-04-19', time: '10:00 AM', fee: 500 },
    { id: 2, patient: 'Jane Doe', doctor: 'Dr. Kumar', date: '2025-04-19', time: '11:00 AM', fee: 600 },
  ],
  'Doctor Attendance': [
    { id: 1, doctor: 'Dr. Smith', present: 'Yes', date: '2025-04-19' },
    { id: 2, doctor: 'Dr. Kumar', present: 'No', date: '2025-04-19' },
  ],
};

const ReportViewer = () => {
  const [selectedReport, setSelectedReport] = useState('Appointments Report');

  const handlePrint = () => {
    const content = document.getElementById('report-table');
    const now = new Date().toLocaleString();

    const win = window.open('', '_blank');
    win.document.write(`
      <html>
        <head>
          <title>${selectedReport}</title>
          <style>
            body { font-family: Arial; padding: 30px; }
            h1, h2 { text-align: center; margin: 0; }
            .timestamp { text-align: right; margin: 20px 0; font-size: 14px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #333; padding: 10px; text-align: left; font-size: 14px; }
            th { background-color: #f0f0f0; }
            .signature { margin-top: 60px; text-align: right; font-size: 16px; }
            .signature-line { margin-top: 40px; border-top: 1px solid #333; width: 200px; float: right; text-align: center; }
          </style>
        </head>
        <body>
          <h1>🏥 MyCare Hospital</h1>
          <h2>${selectedReport}</h2>
          <div class="timestamp">🕒 Generated on: ${now}</div>
          ${content.outerHTML}
          <div class="signature">
            <div class="signature-line">Authorized Signature</div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const renderTable = () => {
    const data = mockData[selectedReport];

    if (selectedReport === 'Appointments Report') {
      return (
        <table id="report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Date</th>
              <th>Time</th>
              <th>Fee</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={row.id}>
                <td>{idx + 1}</td>
                <td>{row.patient}</td>
                <td>{row.doctor}</td>
                <td>{row.date}</td>
                <td>{row.time}</td>
                <td>₹{row.fee}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    if (selectedReport === 'Doctor Attendance') {
      return (
        <table id="report-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Doctor</th>
              <th>Present</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, idx) => (
              <tr key={row.id}>
                <td>{idx + 1}</td>
                <td>{row.doctor}</td>
                <td>{row.present}</td>
                <td>{row.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }

    return null;
  };

  return (
    <div className="report-container">
      <h1>📊 Report Viewer</h1>
      <div className="report-controls">
        <select
          value={selectedReport}
          onChange={(e) => setSelectedReport(e.target.value)}
        >
          {Object.keys(mockData).map((type) => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        <button onClick={handlePrint}>🖨️ Print Report</button>
      </div>

      <div className="report-table-wrapper">
        {renderTable()}
      </div>
    </div>
  );
};

export default ReportViewer;
