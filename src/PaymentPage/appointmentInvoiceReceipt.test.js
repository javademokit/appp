import { createAppointmentInvoiceHtml } from './appointmentInvoiceReceipt';

test('creates an escaped invoice audit printout with payment history', () => {
  const html = createAppointmentInvoiceHtml({
    invoiceNumber: 'INV-123',
    appointmentId: 'c648b286-bd95-4168-a6be-566088a0f8c7',
    appointmentNumber: 'APT-123',
    patientName: '<Aadi & Co>',
    patientId: 'PT-123',
    doctorName: 'Dr. Example',
    service: 'Consultation',
    amount: 500,
    paidAmount: 250,
    balanceDue: 250,
    status: 'PARTIALLY_PAID',
    createdAt: '2026-10-15T10:00:00Z',
    payments: [{
      amount: 250,
      method: 'UPI',
      reference: 'TXN-123',
      receivedBy: 'billing.user',
      status: 'RECEIVED',
      createdAt: '2026-10-15T10:30:00Z',
    }],
  });

  expect(html).toContain('INV-123');
  expect(html).toContain('APT-123');
  expect(html).not.toContain('c648b286-bd95-4168-a6be-566088a0f8c7');
  expect(html).toContain('&lt;Aadi &amp; Co&gt;');
  expect(html).toContain('TXN-123');
  expect(html).toContain('billing.user');
  expect(html).toContain('PARTIALLY PAID');
});

test('prints a clear empty payment history when no payments exist', () => {
  const appointmentId = 'c648b286-bd95-4168-a6be-566088a0f8c7';
  const html = createAppointmentInvoiceHtml({ invoiceNumber: 'INV-EMPTY', appointmentId, payments: [] });

  expect(html).toContain('No payments recorded.');
  expect(html).toContain('Legacy booking');
  expect(html).not.toContain(appointmentId);
});

test('uses the hospital logo, signature area, and staff member in the existing receipt footer', () => {
  const html = createAppointmentInvoiceHtml({ invoiceNumber: 'INV-789' }, 'billing.user');

  expect(html).toContain('<img src="/medora_ai_logo.svg" alt="Medora AI Health Care">');
  expect(html).toContain('<div class="signature-line"></div>');
  expect(html).toContain('<p>Signature</p>');
  expect(html).toContain('<strong>Printed by:</strong> billing.user');
  expect(html).toMatch(/<strong>Date:<\/strong> \d{2}\/\d{2}\/\d{4}/);
});
