const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]);

const receiptValue = (value) => escapeHtml(value || '—');

export function createAppointmentReceiptHtml(appointment, bookingTime, crmUserName) {
  const resolvedBookingTime = bookingTime || (appointment.bookingTime
    ? new Date(appointment.bookingTime).toLocaleString('en-GB')
    : 'Not recorded for this appointment');
  const receiptDate = new Date().toLocaleDateString('en-GB');
  const rows = [
    ['Booking No.', appointment.appointmentNumber || 'Legacy booking'],
    ['Token number', appointment.tokenNumber ? String(appointment.tokenNumber).padStart(3, '0') : '—'],
    ['Patient ID', appointment.patientId],
    ['Patient', appointment.patientName],
    ['Doctor', appointment.doctor],
    ['Date', appointment.date],
    ['Time', appointment.time],
    ['Reason', appointment.reason],
    ['Fee', appointment.fee],
  ];

  return `
    <html>
      <head>
        <title>Appointment Receipt</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #222; }
          .print-brand { display: flex; align-items: center; justify-content: center; gap: 14px; margin-bottom: 12px; }
          .print-brand img { width: 112px; height: auto; }
          h2, h4 { text-align: center; margin: 5px 0; }
          p { text-align: center; margin: 2px 0; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #333; padding: 10px; text-align: left; vertical-align: top; }
          th { width: 38%; background: #edf5f2; }
          .receipt-footer { display: flex; justify-content: space-between; align-items: flex-end; gap: 24px; margin-top: 64px; page-break-inside: avoid; }
          .signature-block { width: 220px; text-align: center; }
          .signature-line { border-top: 1px solid #333; margin-bottom: 8px; }
          .signature-block p, .receipt-meta p { margin: 4px 0; }
          .receipt-meta { text-align: right; }
          .receipt-meta p { text-align: right; }
          .close-btn {
            display: block;
            margin: 30px auto 0;
            padding: 10px 20px;
            font-size: 16px;
            background-color: #f44336;
            color: white;
            border: none;
            cursor: pointer;
          }
          @media print { .close-btn { display: none; } }
        </style>
      </head>
      <body>
        <header class="print-brand"><img src="/medora_ai_logo.svg" alt="Medora AI Health Care"><h2>Wellness Hospital</h2></header>
        <p>123 Health St, Wellness City, IN · PIN: 000000</p>
        <p>Main phone: +91 98765 43210</p>
        <p>Emergency: +91 00000 00000 · Patient care: +91 00000 00001</p>
        <h4>Appointment Receipt</h4>
        <table>
          <tbody>
            ${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${receiptValue(value)}</td></tr>`).join('')}
          </tbody>
        </table>
        <p>Booking time: ${escapeHtml(resolvedBookingTime)}</p>
        <footer class="receipt-footer">
          <div class="signature-block">
            <div class="signature-line"></div>
            <p>Signature</p>
          </div>
          <div class="receipt-meta">
            <p><strong>CRM user:</strong> ${receiptValue(crmUserName || 'Unknown')}</p>
            <p><strong>Date:</strong> ${escapeHtml(receiptDate)}</p>
          </div>
        </footer>
        <button class="close-btn" onclick="window.close()">Close</button>
      </body>
    </html>
  `;
}

export function printAppointmentReceipt(appointment, bookingTime, crmUserName) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.document.write(createAppointmentReceiptHtml(appointment, bookingTime, crmUserName));
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  return true;
}
