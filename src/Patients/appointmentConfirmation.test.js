import { createAppointmentConfirmationPdf } from './appointmentConfirmation';

test('creates a PDF confirmation containing patient and booking details', async () => {
  const pdf = createAppointmentConfirmationPdf({
    id: 'booking-1',
    doctor: 'Dr. Example',
    date: '2030-01-03',
    time: '10:00 AM',
    reason: 'Checkup (annual)',
    appointmentStatus: 'confirmed',
    billingStatus: 'PAID',
    balanceDue: '0.00',
  }, {
    patientId: 'PT-001',
    patientName: 'A Patient',
  });

  expect(pdf.type).toBe('application/pdf');
  expect(pdf.size).toBeGreaterThan(0);
  const fileReader = new FileReader();
  const text = await new Promise((resolve, reject) => {
    fileReader.onload = () => resolve(fileReader.result);
    fileReader.onerror = reject;
    fileReader.readAsText(pdf);
  });
  expect(text).toContain('%PDF-1.4');
  expect(text).toContain('(Patient: A Patient)');
  expect(text).toContain('(Booking reference: booking-1)');
  expect(text).toContain('(Reason for visit: Checkup \\(annual\\)) Tj');
  expect(text).toContain('(Appointment status: CONFIRMED)');
});
