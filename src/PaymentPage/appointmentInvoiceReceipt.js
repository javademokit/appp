const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]);

const formatMoney = (value, currency = 'INR') => {
  const amount = Number(value);
  return Number.isFinite(amount)
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(amount)
    : '—';
};

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('en-IN');
};

export function createAppointmentInvoiceHtml(invoice, currentUserName = '') {
  const currency = invoice.currency || 'INR';
  const printedDate = new Date().toLocaleDateString('en-GB');
  const payments = (invoice.payments || []).map((payment) => `
    <tr>
      <td>${escapeHtml(formatDate(payment.createdAt))}</td>
      <td>${escapeHtml(payment.method || payment.provider || '—')}</td>
      <td>${escapeHtml(payment.reference || payment.gatewayPaymentId || '—')}</td>
      <td>${escapeHtml(payment.receivedBy || '—')}</td>
      <td>${escapeHtml(payment.status || '—')}</td>
      <td>${escapeHtml(formatMoney(payment.amount, currency))}</td>
    </tr>`).join('');
  const rows = [
    ['Invoice number', invoice.invoiceNumber],
    ['Appointment number', invoice.appointmentNumber || 'Legacy booking'],
    ['Patient', invoice.patientName],
    ['Patient ID', invoice.patientId],
    ['Patient email', invoice.patientEmail],
    ['Patient mobile', invoice.patientMobile],
    ['Doctor', invoice.doctorName],
    ['Service', invoice.service],
    ['Created', formatDate(invoice.createdAt)],
    ['Status', String(invoice.status || '—').replaceAll('_', ' ')],
    ['Amount', formatMoney(invoice.amount, currency)],
    ['Paid', formatMoney(invoice.paidAmount, currency)],
    ['Balance due', formatMoney(invoice.balanceDue, currency)],
  ];

  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
    <title>Invoice ${escapeHtml(invoice.invoiceNumber || '')}</title>
    <style>
      body{font:14px Arial,sans-serif;color:#1d302d;padding:24px}
      .print-brand{display:flex;align-items:center;justify-content:center;gap:14px;margin-bottom:12px;border-bottom:2px solid #176b5d;padding-bottom:14px}
      .print-brand img{width:112px;height:auto}
      h1,h2,h3,p{text-align:center}
      h1{font-size:22px;margin:5px 0}
      h2{font-size:17px;margin:5px 0}
      p{color:#60736e;margin:4px 0}
      table{width:100%;border-collapse:collapse;margin-top:24px}
      th,td{border:1px solid #d5dfda;padding:9px;text-align:left;vertical-align:top}
      th{background:#edf5f2;width:30%}.payment-table th{width:auto}
      h3{font-size:16px;margin:28px 0 0}
      .receipt-footer{display:flex;justify-content:space-between;align-items:flex-end;gap:24px;margin-top:64px;page-break-inside:avoid}
      .signature-block{width:220px;text-align:center}
      .signature-line{border-top:1px solid #333;margin-bottom:8px}
      .signature-block p,.receipt-meta p{margin:4px 0}
      .receipt-meta,.receipt-meta p{text-align:right}
      @media print{body{padding:0}tr{break-inside:avoid}}
    </style></head><body>
    <header class="print-brand"><img src="/medora_ai_logo.svg" alt="Medora AI Health Care">
      <div><h1>Medora AI Health Care</h1><p>Appointment invoice · Billing audit copy</p></div></header>
    <p><strong>${escapeHtml(invoice.invoiceNumber || 'Invoice')}</strong></p>
    <table><tbody>${rows.map(([label, value]) => `<tr><th>${escapeHtml(label)}</th><td>${escapeHtml(value || '—')}</td></tr>`).join('')}</tbody></table>
    <h3>Payment history</h3>
    <table class="payment-table"><thead><tr><th>Recorded</th><th>Method / provider</th><th>Reference</th><th>Received by</th><th>Status</th><th>Amount</th></tr></thead>
      <tbody>${payments || '<tr><td colspan="6">No payments recorded.</td></tr>'}</tbody></table>
    <footer class="receipt-footer">
      <div class="signature-block"><div class="signature-line"></div><p>Signature</p></div>
      <div class="receipt-meta">
        <p><strong>Printed by:</strong> ${escapeHtml(currentUserName || 'Unknown')}</p>
        <p><strong>Date:</strong> ${escapeHtml(printedDate)}</p>
      </div>
    </footer>
    </body></html>`;
}

export function printAppointmentInvoice(invoice, currentUserName) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return false;
  printWindow.document.open();
  printWindow.document.write(createAppointmentInvoiceHtml(invoice, currentUserName));
  printWindow.document.close();
  printWindow.focus();
  printWindow.onafterprint = () => printWindow.close();
  printWindow.setTimeout(() => printWindow.print(), 250);
  return true;
}
