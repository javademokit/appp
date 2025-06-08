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
  const [selectedRows, setSelectedRows] = useState([]);

  const data = mockData[selectedReport];

  const toggleSelectRow = (id) => {
    setSelectedRows((prev) =>
      prev.includes(id) ? prev.filter((rid) => rid !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedRows.length === data.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(data.map((row) => row.id));
    }
  };

  const getFilteredRows = () =>
    data.filter((row) => selectedRows.includes(row.id));

  const generateTableHTML = (rows) => {
    if (selectedReport === 'Appointments Report') {
      return `
        <table>
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
            ${rows
              .map(
                (row, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${row.patient}</td>
                <td>${row.doctor}</td>
                <td>${row.date}</td>
                <td>${row.time}</td>
                <td>₹${row.fee}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>`;
    }

    if (selectedReport === 'Doctor Attendance') {
      return `
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Doctor</th>
              <th>Present</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            ${rows
              .map(
                (row, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${row.doctor}</td>
                <td>${row.present}</td>
                <td>${row.date}</td>
              </tr>
            `
              )
              .join('')}
          </tbody>
        </table>`;
    }

    return '';
  };

  const handlePrintSelected = () => {
    const rowsToPrint = getFilteredRows();
    if (rowsToPrint.length === 0) {
      alert('Please select at least one row.');
      return;
    }

    const now = new Date().toLocaleString();
    const htmlContent = generateTableHTML(rowsToPrint);

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
          ${htmlContent}
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
    return (
      <table id="report-table">
        <thead>
          <tr>
            <th>
              <input
                type="checkbox"
                checked={selectedRows.length === data.length}
                onChange={toggleSelectAll}
              />
            </th>
            {selectedReport === 'Appointments Report' ? (
              <>
                <th>#</th>
                <th>Patient</th>
                <th>Doctor</th>
                <th>Date</th>
                <th>Time</th>
                <th>Fee</th>
              </>
            ) : (
              <>
                <th>#</th>
                <th>Doctor</th>
                <th>Present</th>
                <th>Date</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={row.id}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedRows.includes(row.id)}
                  onChange={() => toggleSelectRow(row.id)}
                />
              </td>
              <td>{idx + 1}</td>
              {selectedReport === 'Appointments Report' ? (
                <>
                  <td>{row.patient}</td>
                  <td>{row.doctor}</td>
                  <td>{row.date}</td>
                  <td>{row.time}</td>
                  <td>₹{row.fee}</td>
                </>
              ) : (
                <>
                  <td>{row.doctor}</td>
                  <td>{row.present}</td>
                  <td>{row.date}</td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="report-container">
      <h1>📊 Report Viewer</h1>
      <div className="report-controls">
        <select
          value={selectedReport}
          onChange={(e) => {
            setSelectedReport(e.target.value);
            setSelectedRows([]); // reset selection
          }}
        >
          {Object.keys(mockData).map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        <button onClick={handlePrintSelected}>🖨️ Print Selected</button>
      </div>

      <div className="report-table-wrapper">{renderTable()}</div>
    </div>
  );
};

export default ReportViewer;
