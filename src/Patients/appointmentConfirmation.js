const toAsciiText = (value) => String(value || '—')
  .normalize('NFKD')
  .replace(/[^\x20-\x7E]/g, '?');

const toPdfText = (value) => toAsciiText(value)
  .replace(/\\/g, '\\\\')
  .replace(/\(/g, '\\(')
  .replace(/\)/g, '\\)');

const wrapText = (value, lineLength = 78) => {
  const text = toAsciiText(value);
  const words = text.match(/\S+/g) || ['—'];
  const lines = [];
  let line = '';

  words.forEach((word) => {
    if (word.length > lineLength) word = `${word.slice(0, lineLength - 3)}...`;
    if (line && `${line} ${word}`.length > lineLength) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  });
  if (line) lines.push(line);
  return lines;
};

export function createAppointmentConfirmationPdf(appointment, profile) {
  const details = [
    ['Patient', profile?.patientName || appointment.patientName],
    ['Patient ID', profile?.patientId || appointment.patientId],
    ['Booking reference', appointment.id],
    ['Doctor', appointment.doctor],
    ['Date', appointment.date],
    ['Time', appointment.time],
    ['Reason for visit', appointment.reason],
    ['Appointment status', 'CONFIRMED'],
    ['Payment', appointment.billingStatus === 'NO_CHARGE'
      ? 'No charge'
      : Number(appointment.balanceDue || 0) > 0
        ? `Cash due at reception: Rs ${appointment.balanceDue}`
        : appointment.invoiceId ? 'Paid' : 'Please contact reception for payment details'],
  ];
  const contentLines = details.flatMap(([label, value]) => (
    wrapText(`${label}: ${value || '—'}`)
  )).slice(0, 34);
  const content = [
    'BT',
    '/F1 20 Tf',
    '52 750 Td',
    '(Appointment Confirmation) Tj',
    '/F1 11 Tf',
    ...contentLines.map((line) => `0 -20 Td\n(${toPdfText(line)}) Tj`),
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Blob([pdf], { type: 'application/pdf' });
}

export function downloadAppointmentConfirmation(appointment, profile) {
  const pdf = createAppointmentConfirmationPdf(appointment, profile);
  const url = URL.createObjectURL(pdf);
  const link = document.createElement('a');
  link.href = url;
  link.download = `appointment-confirmation-${String(appointment.id || 'booking').replace(/[^a-zA-Z0-9-]/g, '-')}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
