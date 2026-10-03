import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import BookAppointment from './BookAppointment';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

const patient = {
  id: 'mongo-patient-1',
  patientId: 'PT-EXISTING',
  patientName: 'Existing Patient',
  patientAge: '42',
  gender: 'Female',
  patientmobileNo: '5551000',
  patientEmailId: 'patient@example.test',
  patientAddress: 'Main Street',
};

const dateDaysAgo = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

function mockDirectories(patients = [], appointments = []) {
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/doctors') {
      return { ok: true, json: async () => [{ id: 'doctor-1', doctorName: 'Dr. Example', doctorfee: '500', doctorAvailabletime: ['10:00 AM'] }] };
    }
    if (path === '/patients') return { ok: true, json: async () => patients };
    if (path === '/billing/appointment-invoices/gateways') {
      return { ok: true, json: async () => ({ RAZORPAY: false, PAYU: false, STRIPE: false }) };
    }
    if (path === '/appointments1' && !options.method) return { ok: true, json: async () => appointments };
    if (path.startsWith('/appointments1/availability?')) return { ok: true, json: async () => ['10:00 AM'] };
    if (path === '/appointments1' && options.method === 'POST') {
      const appointment = JSON.parse(options.body);
      return { ok: true, json: async () => ({
        ...appointment,
        id: 'appointment-1',
        patientId: appointment.patientId || 'PT-GENERATED',
        invoiceId: 'invoice-1',
        invoiceNumber: 'INV-123',
        billingStatus: appointment.fee === '0' ? 'NO_CHARGE' : 'PENDING',
        balanceDue: appointment.fee === '0' ? '0.00' : appointment.fee,
      }) };
    }
    if (path === '/billing/appointment-invoices/invoice-1/payments' && options.method === 'POST') {
      return { ok: true, json: async () => ({ status: 'PAID', balanceDue: 0 }) };
    }
    throw new Error(`Unexpected API request: ${path}`);
  });
}

async function fillAppointmentDetails() {
  fireEvent.change(document.querySelector('select[name="doctor"]'), { target: { value: 'doctor-1' } });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  fireEvent.change(document.querySelector('input[name="date"]'), { target: { value: tomorrow.toISOString().slice(0, 10) } });
  await screen.findByRole('option', { name: '10:00 AM' });
  fireEvent.change(screen.getByDisplayValue('Select Time Slot'), { target: { value: '10:00 AM' } });
}

afterEach(() => jest.clearAllMocks());

test('books a new patient and displays the Patient ID returned by the API', async () => {
  mockDirectories();
  render(<BookAppointment />);
  await screen.findByRole('option', { name: 'Dr. Example' });

  fireEvent.change(screen.getByPlaceholderText('Patient Full Name'), { target: { value: 'New Patient' } });
  fireEvent.change(screen.getByPlaceholderText('Patient Age'), { target: { value: '31' } });
  fireEvent.change(screen.getByPlaceholderText('Patient Mobile No'), { target: { value: '5552000' } });
  fireEvent.change(screen.getByDisplayValue('Select Gender'), { target: { value: 'Female' } });
  await fillAppointmentDetails();
  expect(document.querySelector('select[name="doctor"]')).toHaveValue('doctor-1');
  fireEvent.click(screen.getByRole('button', { name: 'Book Appointment' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Patient ID: PT-GENERATED');
  const [, request] = apiFetch.mock.calls.find(([path, options]) => path === '/appointments1' && options?.method === 'POST');
  expect(JSON.parse(request.body)).toMatchObject({ patientName: 'New Patient', patientAge: '31' });
  expect(JSON.parse(request.body)).toMatchObject({ doctorId: 'doctor-1', doctor: 'Dr. Example' });
  expect(JSON.parse(request.body)).not.toHaveProperty('patientId');
  expect(await screen.findByText(/INV-123/)).toBeInTheDocument();
});

test('records payment against the invoice created for a newly booked appointment', async () => {
  mockDirectories();
  render(<BookAppointment />);
  await screen.findByRole('option', { name: 'Dr. Example' });
  fireEvent.change(screen.getByPlaceholderText('Patient Full Name'), { target: { value: 'New Patient' } });
  fireEvent.change(screen.getByPlaceholderText('Patient Age'), { target: { value: '31' } });
  fireEvent.change(screen.getByPlaceholderText('Patient Mobile No'), { target: { value: '5552000' } });
  fireEvent.change(screen.getByDisplayValue('Select Gender'), { target: { value: 'Female' } });
  await fillAppointmentDetails();
  fireEvent.click(screen.getByRole('button', { name: 'Book Appointment' }));
  await screen.findByText(/INV-123/);
  fireEvent.click(screen.getByRole('button', { name: 'Record payment' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
    '/billing/appointment-invoices/invoice-1/payments',
    expect.objectContaining({
      method: 'POST',
      body: '{"amount":500,"method":"CASH"}',
    }),
  ));
  expect(await screen.findByText('Payment received. Invoice is fully paid.')).toBeInTheDocument();
});

test('books a returning patient using the existing canonical ID without re-entering demographics', async () => {
  mockDirectories([patient]);
  render(<BookAppointment />);
  await screen.findByRole('option', { name: /Existing Patient/ });
  fireEvent.change(screen.getByLabelText('Patient record'), { target: { value: 'PT-EXISTING' } });
  await fillAppointmentDetails();
  expect(document.querySelector('select[name="doctor"]')).toHaveValue('doctor-1');
  fireEvent.click(screen.getByRole('button', { name: 'Book Appointment' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/appointments1', expect.objectContaining({
    method: 'POST',
    body: expect.stringContaining('"patientId":"PT-EXISTING"'),
  })));
  expect(screen.getByText('Existing Patient')).toBeInTheDocument();
  expect(screen.queryByPlaceholderText('Patient Full Name')).not.toBeInTheDocument();
});

test.each([
  [15, 0],
  [16, '500'],
])('applies the repeat-visit fee rule at %i days since the previous appointment', async (daysAgo, expectedFee) => {
  mockDirectories([patient], [{
    id: 'previous-appointment',
    patientId: 'PT-EXISTING',
    mobileNo: '5551000',
    date: dateDaysAgo(daysAgo),
    appointmentStatus: 'confirmed',
  }]);
  render(<BookAppointment />);
  await screen.findByRole('option', { name: 'Dr. Example' });
  fireEvent.change(screen.getByLabelText('Patient record'), { target: { value: 'PT-EXISTING' } });
  await fillAppointmentDetails();
  fireEvent.click(screen.getByRole('button', { name: 'Book Appointment' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/appointments1', expect.objectContaining({
    method: 'POST',
  })));
  const [, request] = apiFetch.mock.calls.find(([path, options]) => path === '/appointments1' && options?.method === 'POST');
  expect(JSON.parse(request.body).fee).toBe(expectedFee);
});

test('finds and selects an existing patient by mobile number', async () => {
  mockDirectories([patient]);
  render(<BookAppointment />);
  await screen.findByRole('option', { name: /Existing Patient/ });

  fireEvent.change(screen.getByLabelText('Find existing patient by mobile number'), { target: { value: '(555) 1000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));

  expect(screen.getByText('Patient ID: PT-EXISTING')).toBeInTheDocument();
  expect(screen.queryByPlaceholderText('Patient Full Name')).not.toBeInTheDocument();
});

test('shows the backend reason when an appointment is rejected', async () => {
  mockDirectories();
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/doctors') {
      return { ok: true, json: async () => [{ id: 'doctor-1', doctorName: 'Dr. Example', doctorfee: '500', doctorAvailabletime: ['10:00 AM'] }] };
    }
    if (path === '/patients') return { ok: true, json: async () => [] };
    if (path === '/appointments1' && !options.method) return { ok: true, json: async () => [] };
    if (path.startsWith('/appointments1/availability?')) return { ok: true, json: async () => ['10:00 AM'] };
    if (path === '/appointments1' && options.method === 'POST') {
      return { ok: false, status: 409, json: async () => ({ detail: 'Selected appointment slot is already booked' }) };
    }
    throw new Error(`Unexpected API request: ${path}`);
  });
  render(<BookAppointment />);
  await screen.findByRole('option', { name: 'Dr. Example' });
  fireEvent.change(screen.getByPlaceholderText('Patient Full Name'), { target: { value: 'New Patient' } });
  fireEvent.change(screen.getByPlaceholderText('Patient Age'), { target: { value: '31' } });
  fireEvent.change(screen.getByPlaceholderText('Patient Mobile No'), { target: { value: '5552000' } });
  fireEvent.change(screen.getByDisplayValue('Select Gender'), { target: { value: 'Female' } });
  await fillAppointmentDetails();
  fireEvent.click(screen.getByRole('button', { name: 'Book Appointment' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Selected appointment slot is already booked');
});

test('shows a helpful explanation when the server returns an unspecified conflict', async () => {
  mockDirectories();
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/doctors') {
      return { ok: true, json: async () => [{ id: 'doctor-1', doctorName: 'Dr. Example', doctorfee: '500', doctorAvailabletime: ['10:00 AM'] }] };
    }
    if (path === '/patients') return { ok: true, json: async () => [] };
    if (path === '/appointments1' && !options.method) return { ok: true, json: async () => [] };
    if (path.startsWith('/appointments1/availability?')) return { ok: true, json: async () => ['10:00 AM'] };
    if (path === '/appointments1' && options.method === 'POST') {
      return { ok: false, status: 409, json: async () => ({ error: 'Conflict' }) };
    }
    throw new Error(`Unexpected API request: ${path}`);
  });
  render(<BookAppointment />);
  await screen.findByRole('option', { name: 'Dr. Example' });
  fireEvent.change(screen.getByPlaceholderText('Patient Full Name'), { target: { value: 'New Patient' } });
  fireEvent.change(screen.getByPlaceholderText('Patient Age'), { target: { value: '31' } });
  fireEvent.change(screen.getByPlaceholderText('Patient Mobile No'), { target: { value: '5552000' } });
  fireEvent.change(screen.getByDisplayValue('Select Gender'), { target: { value: 'Female' } });
  await fillAppointmentDetails();
  fireEvent.click(screen.getByRole('button', { name: 'Book Appointment' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'The appointment conflicts with an existing booking or patient record.',
  );
});
