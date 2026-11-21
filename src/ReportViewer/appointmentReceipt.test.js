import { createAppointmentReceiptHtml, printAppointmentReceipt } from './appointmentReceipt';

const appointment = {
  appointmentNumber: 'APT-20',
  tokenNumber: 20,
  patientName: 'A Patient',
  patientId: 'PT-001',
  doctor: 'Dr. Example',
  date: '2030-01-03',
  time: '10:00',
  reason: 'Checkup <annual>',
  fee: '500.00',
};

test('builds the branded table receipt with signature, CRM user, and date at the bottom', () => {
  const html = createAppointmentReceiptHtml(appointment, '02/01/2030, 20:34:05', 'crm.agent');

  expect(html).toContain('<h2>Wellness Hospital</h2>');
  expect(html).toContain('<h4>Appointment Receipt</h4>');
  expect(html).toContain('.print-brand');
  expect(html).toContain('<table>');
  expect(html).toContain('text-align: left; vertical-align: top;');
  expect(html).toContain('<th>Booking No.</th><td>APT-20</td>');
  expect(html).toContain('<th>Token number</th><td>020</td>');
  expect(html).toContain('Checkup &lt;annual&gt;');
  expect(html).toContain('Booking time: 02/01/2030, 20:34:05');
  expect(html).toContain('<div class="signature-line"></div>');
  expect(html).toContain('<p><strong>CRM user:</strong> crm.agent</p>');
  expect(html).toContain('<p><strong>Date:</strong>');
  expect(html.indexOf('class="receipt-footer"')).toBeGreaterThan(html.indexOf('Booking time:'));
});

test('prints the shared receipt template in a separate window', () => {
  const printWindow = {
    document: { write: jest.fn(), close: jest.fn() },
    focus: jest.fn(),
    print: jest.fn(),
  };
  jest.spyOn(window, 'open').mockReturnValue(printWindow);

  expect(printAppointmentReceipt(appointment, '02/01/2030, 20:34:05', 'crm.agent')).toBe(true);
  expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('<table>'));
  expect(printWindow.document.close).toHaveBeenCalled();
  expect(printWindow.focus).toHaveBeenCalled();
  expect(printWindow.print).toHaveBeenCalled();
});

test('reports when the browser blocks the receipt popup', () => {
  jest.spyOn(window, 'open').mockReturnValue(null);

  expect(printAppointmentReceipt(appointment)).toBe(false);
});
