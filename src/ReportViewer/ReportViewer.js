import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../API/api';
import { printAppointmentReceipt } from './appointmentReceipt';
import './ReportViewer.css';

const APPOINTMENT_RECEIPTS_REPORT = 'Appointment Receipts';

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

const ReportViewer = ({ username = '' }) => {
  const [selectedReport, setSelectedReport] = useState('Appointments Report');
  const [selectedRows, setSelectedRows] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [mobileSearch, setMobileSearch] = useState('');
  const [appointmentDateFilter, setAppointmentDateFilter] = useState('');
  const [submittedSearch, setSubmittedSearch] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [appointmentError, setAppointmentError] = useState('');
  const [receiptError, setReceiptError] = useState('');

  const isAppointmentReceiptsReport = selectedReport === APPOINTMENT_RECEIPTS_REPORT;
  const data = mockData[selectedReport] || [];
  const matchingAppointments = useMemo(() => appointments.filter((appointment) => (
    submittedSearch
    && String(appointment.mobileNo || '').replace(/\D/g, '').includes(submittedSearch.mobileDigits)
    && (!submittedSearch.date || appointment.date === submittedSearch.date)
  )), [appointments, submittedSearch]);

  const handleAppointmentSearch = (event) => {
    event.preventDefault();
    const mobileDigits = mobileSearch.replace(/\D/g, '');
    if (mobileDigits.length < 3) {
      setSubmittedSearch(null);
      setSearchError('Enter at least 3 digits of the patient mobile number.');
      return;
    }

    setSearchError('');
    setReceiptError('');
    setSubmittedSearch({ mobileDigits, date: appointmentDateFilter });
  };

  useEffect(() => {
    if (!isAppointmentReceiptsReport) return undefined;

    let active = true;
    const loadAppointments = async () => {
      setLoadingAppointments(true);
      setAppointmentError('');
      try {
        const response = await apiFetch('/appointments1');
        const result = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(result.message || result.detail || `Could not load appointments (${response.status})`);
        }
        if (!Array.isArray(result)) throw new Error('Appointment service returned an invalid appointment list');
        if (active) setAppointments(result);
      } catch (requestError) {
        if (active) setAppointmentError(requestError.message || 'Could not load appointments');
      } finally {
        if (active) setLoadingAppointments(false);
      }
    };

    loadAppointments();
    return () => { active = false; };
  }, [isAppointmentReceiptsReport]);

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
            .print-brand { display: flex; align-items: center; justify-content: center; gap: 16px; margin-bottom: 16px; }
            .print-brand img { width: 120px; height: auto; }
            .timestamp { text-align: right; margin: 20px 0; font-size: 14px; color: #555; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #333; padding: 10px; text-align: left; font-size: 14px; }
            th { background-color: #f0f0f0; }
            .signature { margin-top: 60px; text-align: right; font-size: 16px; }
            .signature-line { margin-top: 40px; border-top: 1px solid #333; width: 200px; float: right; text-align: center; }
          </style>
        </head>
        <body>
          <header class="print-brand"><img src="/medora_ai_logo.svg" alt="Medora AI"><h1>MyCare Hospital</h1></header>
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
      <header className="report-heading">
        <p>Operations &amp; finance</p>
        <h1>Report Viewer</h1>
        <span>Review hospital reports and access patient appointment receipts.</span>
      </header>
      <div className="report-controls">
        <select
          aria-label="Report type"
          value={selectedReport}
          onChange={(e) => {
            setSelectedReport(e.target.value);
            setSelectedRows([]); // reset selection
            setMobileSearch('');
            setAppointmentDateFilter('');
            setSubmittedSearch(null);
            setSearchError('');
            setReceiptError('');
          }}
        >
          {[...Object.keys(mockData), APPOINTMENT_RECEIPTS_REPORT].map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
        {!isAppointmentReceiptsReport && <button onClick={handlePrintSelected}>🖨️ Print Selected</button>}
      </div>

      {isAppointmentReceiptsReport ? (
        <section className="receipt-report" aria-label="Appointment receipt lookup">
          <form className="receipt-search-form" onSubmit={handleAppointmentSearch}>
            <label htmlFor="receipt-patient-mobile">Patient mobile number</label>
            <input
              id="receipt-patient-mobile"
              type="search"
              inputMode="tel"
              autoComplete="off"
              placeholder="Enter a full or partial mobile number"
              value={mobileSearch}
              onChange={(event) => {
                setMobileSearch(event.target.value);
                setSubmittedSearch(null);
                setSearchError('');
                setReceiptError('');
              }}
              disabled={loadingAppointments}
            />
            <label htmlFor="receipt-appointment-date">Appointment date (optional)</label>
            <input
              id="receipt-appointment-date"
              type="date"
              value={appointmentDateFilter}
              onChange={(event) => {
                setAppointmentDateFilter(event.target.value);
                setSubmittedSearch(null);
                setReceiptError('');
              }}
              disabled={loadingAppointments}
            />
            <button className="receipt-search-button" type="submit" disabled={loadingAppointments}>
              Search
            </button>
          </form>

          {loadingAppointments && <p role="status">Loading appointments…</p>}
          {appointmentError && <p className="receipt-report-error" role="alert">{appointmentError}</p>}
          {searchError && <p className="receipt-report-error" role="alert">{searchError}</p>}
          {receiptError && <p className="receipt-report-error" role="alert">{receiptError}</p>}
          {!submittedSearch && !searchError
            && <p role="status">Enter a mobile number and optionally an appointment date, then select Search.</p>}

          {matchingAppointments.length > 0 && (
            <div className="report-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Booking No.</th><th>Token</th><th>Patient</th><th>Mobile</th>
                    <th>Doctor</th><th>Date</th><th>Time</th><th>Reason</th><th>Fee</th><th>Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {matchingAppointments.map((appointment) => (
                    <tr key={appointment.id}>
                      <td>{appointment.appointmentNumber || 'Legacy booking'}</td>
                      <td>{appointment.tokenNumber ? String(appointment.tokenNumber).padStart(3, '0') : '—'}</td>
                      <td>{appointment.patientName || '—'}<small>{appointment.patientId || 'No patient ID'}</small></td>
                      <td>{appointment.mobileNo || '—'}</td>
                      <td>{appointment.doctor || '—'}</td>
                      <td>{appointment.date || '—'}</td>
                      <td>{appointment.time || '—'}</td>
                      <td>{appointment.reason || '—'}</td>
                      <td>₹{Number(appointment.fee || 0).toLocaleString('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}</td>
                      <td>
                        <button
                          className="receipt-download-button"
                          type="button"
                          onClick={() => {
                            setReceiptError(printAppointmentReceipt(appointment, undefined, username)
                              ? ''
                              : 'Allow pop-ups to print or save the appointment receipt.');
                          }}
                        >
                          Print / Save as PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {submittedSearch && !loadingAppointments && !appointmentError && matchingAppointments.length === 0
            && <p role="status">No appointment receipts found for this mobile number and date.</p>}
        </section>
      ) : <div className="report-table-wrapper">{renderTable()}</div>}
    </div>
  );
};

export default ReportViewer;
