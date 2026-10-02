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

function mockDirectories(patients = []) {
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/doctors') {
      return { ok: true, json: async () => [{ id: 'doctor-1', doctorName: 'Dr. Example', doctorfee: '500', doctorAvailabletime: ['10:00 AM'] }] };
    }
    if (path === '/patients') return { ok: true, json: async () => patients };
    if (path === '/appointments1' && options.method === 'POST') {
      const appointment = JSON.parse(options.body);
      return { ok: true, json: async () => ({ ...appointment, id: 'appointment-1', patientId: appointment.patientId || 'PT-GENERATED' }) };
    }
    throw new Error(`Unexpected API request: ${path}`);
  });
}

function fillAppointmentDetails() {
  fireEvent.change(document.querySelector('select[name="doctor"]'), { target: { value: 'doctor-1' } });
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  fireEvent.change(screen.getByDisplayValue('Select Time Slot'), { target: { value: '10:00 AM' } });
  fireEvent.change(document.querySelector('input[name="date"]'), { target: { value: tomorrow.toISOString().slice(0, 10) } });
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
  fillAppointmentDetails();
  expect(document.querySelector('select[name="doctor"]')).toHaveValue('doctor-1');
  fireEvent.click(screen.getByRole('button', { name: 'Book Appointment' }));

  expect(await screen.findByRole('status')).toHaveTextContent('Patient ID: PT-GENERATED');
  const [, request] = apiFetch.mock.calls.find(([path, options]) => path === '/appointments1' && options.method === 'POST');
  expect(JSON.parse(request.body)).toMatchObject({ patientName: 'New Patient', patientAge: '31' });
  expect(JSON.parse(request.body)).toMatchObject({ doctorId: 'doctor-1', doctor: 'Dr. Example' });
  expect(JSON.parse(request.body)).not.toHaveProperty('patientId');
});

test('books a returning patient using the existing canonical ID without re-entering demographics', async () => {
  mockDirectories([patient]);
  render(<BookAppointment />);
  await screen.findByRole('option', { name: /Existing Patient/ });
  fireEvent.change(screen.getByLabelText('Patient record'), { target: { value: 'PT-EXISTING' } });
  fillAppointmentDetails();
  expect(document.querySelector('select[name="doctor"]')).toHaveValue('doctor-1');
  fireEvent.click(screen.getByRole('button', { name: 'Book Appointment' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/appointments1', expect.objectContaining({
    method: 'POST',
    body: expect.stringContaining('"patientId":"PT-EXISTING"'),
  })));
  expect(screen.getByText('Existing Patient')).toBeInTheDocument();
  expect(screen.queryByPlaceholderText('Patient Full Name')).not.toBeInTheDocument();
});
