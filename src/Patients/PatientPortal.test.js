import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import PatientPortal from './PatientPortal';
import { downloadAppointmentConfirmation } from './appointmentConfirmation';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));
jest.mock('./appointmentConfirmation', () => ({
  downloadAppointmentConfirmation: jest.fn(),
}));

afterEach(() => jest.clearAllMocks());

test('loads the signed-in account patient profile and its linked appointments', async () => {
  apiFetch.mockImplementation(async (path) => {
    const responses = {
      '/patient-portal/profile': { patientId: 'PT-CANONICAL', patientName: 'A Patient', patientAge: '37', gender: 'Female' },
      '/patient-portal/appointments': [{ id: 'booking-1', patientId: 'PT-CANONICAL', date: '2030-01-03', time: '10:00 AM', doctor: 'Dr. Example', appointmentStatus: 'pending' }],
      '/doctors': [],
    };
    return { ok: true, json: async () => responses[path] };
  });

  render(<PatientPortal />);

  expect(await screen.findByText('Patient ID: PT-CANONICAL')).toBeInTheDocument();
  expect(screen.getByText('Dr. Example')).toBeInTheDocument();
  expect(screen.getByText(/Pay in cash at reception/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /pay now|online payment/i })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Download confirmation' })).not.toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith('/patient-portal/profile');
  expect(apiFetch).toHaveBeenCalledWith('/patient-portal/appointments');
});

test('confirmed appointments offer a downloadable confirmation', async () => {
  const appointment = {
    id: 'booking-confirmed',
    patientId: 'PT-CANONICAL',
    date: '2030-01-03',
    time: '10:00 AM',
    doctor: 'Dr. Example',
    reason: 'Checkup',
    appointmentStatus: 'confirmed',
    billingStatus: 'PAID',
    balanceDue: '0.00',
  };
  const profile = { patientId: 'PT-CANONICAL', patientName: 'A Patient' };
  apiFetch.mockImplementation(async (path) => {
    const responses = {
      '/patient-portal/profile': profile,
      '/patient-portal/appointments': [appointment],
      '/doctors': [],
    };
    return { ok: true, json: async () => responses[path] };
  });

  render(<PatientPortal />);

  fireEvent.click(await screen.findByRole('button', { name: 'Download confirmation' }));

  expect(downloadAppointmentConfirmation).toHaveBeenCalledWith(appointment, profile);
  expect(screen.getByText('Confirmed')).toBeInTheDocument();
});

test('books through the selected doctor profile ID', async () => {
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/patient-portal/appointments' && options.method === 'POST') {
      return { ok: true, json: async () => ({ date: '2030-01-03', time: '10:00 AM' }) };
    }
    if (path === '/patient-portal/profile') {
      return { ok: true, json: async () => ({ patientId: 'PT-CANONICAL', patientName: 'A Patient' }) };
    }
    if (path === '/patient-portal/appointments') {
      return { ok: true, json: async () => [] };
    }
    if (path === '/doctors') {
      return { ok: true, json: async () => [{
        id: 'doctor-profile-1',
        doctorName: 'Dr. Example',
        doctorSpecialistName: 'Cardiology',
        doctorDestination: 'Cardiology Department',
        doctorAvailabletime: ['10:00 AM'],
      }] };
    }
    if (path.startsWith('/patient-portal/availability?')) {
      return { ok: true, json: async () => ['10:00 AM'] };
    }
    return { ok: false, json: async () => ({ message: 'Unexpected request' }) };
  });

  render(<PatientPortal />);
  await screen.findByRole('option', { name: /Dr. Example/ });
  fireEvent.change(await screen.findByLabelText('Doctor'), { target: { value: 'doctor-profile-1' } });
  expect(await screen.findByText('Department / ward: Cardiology Department')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2030-01-03' } });
  await screen.findByRole('option', { name: '10:00 AM' });
  fireEvent.change(screen.getByLabelText('Available time'), { target: { value: '10:00 AM' } });
  fireEvent.click(screen.getByRole('button', { name: 'Book appointment' }));

  await waitFor(() => expect(apiFetch.mock.calls.some(([path, options]) => (
    path === '/patient-portal/appointments' && options?.method === 'POST'
  ))).toBe(true));
  const [, request] = apiFetch.mock.calls.find(([path, options]) => (
    path === '/patient-portal/appointments' && options?.method === 'POST'
  ));
  expect(JSON.parse(request.body)).toMatchObject({
    doctorId: 'doctor-profile-1',
    doctor: 'Dr. Example',
    date: '2030-01-03',
    time: '10:00 AM',
  });
  expect(apiFetch).toHaveBeenCalledWith(
    '/patient-portal/availability?doctorId=doctor-profile-1&date=2030-01-03',
  );
});

test('shows actionable booking error details returned by the API', async () => {
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/patient-portal/appointments' && options.method === 'POST') {
      return { ok: false, status: 409, json: async () => ({ detail: 'Selected time is not available for this doctor' }) };
    }
    if (path === '/patient-portal/profile') {
      return { ok: true, json: async () => ({ patientId: 'PT-CANONICAL', patientName: 'A Patient' }) };
    }
    if (path === '/patient-portal/appointments') return { ok: true, json: async () => [] };
    if (path === '/doctors') return { ok: true, json: async () => [{
      id: 'doctor-profile-1',
      doctorName: 'Dr. Example',
      doctorSpecialistName: 'Cardiology',
      doctorAvailabletime: ['10:00 AM'],
    }] };
    if (path.startsWith('/patient-portal/availability?')) {
      return { ok: true, json: async () => ['10:00 AM'] };
    }
    return { ok: false, status: 404, json: async () => ({ message: 'Unexpected request' }) };
  });

  render(<PatientPortal />);
  await screen.findByRole('option', { name: /Dr. Example/ });
  fireEvent.change(screen.getByLabelText('Doctor'), { target: { value: 'doctor-profile-1' } });
  fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2030-01-03' } });
  await screen.findByRole('option', { name: '10:00 AM' });
  fireEvent.change(screen.getByLabelText('Available time'), { target: { value: '10:00 AM' } });
  fireEvent.click(screen.getByRole('button', { name: 'Book appointment' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('Selected time is not available for this doctor');
});
