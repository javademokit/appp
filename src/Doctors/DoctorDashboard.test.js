import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import DoctorDashboard from './DoctorDashboard';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));
jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
}), { virtual: true });

const appointment = {
  id: 'appointment-1',
  patientId: 'PT-123',
  patientName: 'Aadi Patient',
  doctor: 'Dr. Example',
  date: '2026-10-02',
  time: '09:30',
  reason: 'Follow-up',
  appointmentStatus: 'confirmed',
};

afterEach(() => jest.clearAllMocks());

test('doctor reviews a linked patient and completes a consultation using persisted clinical fields', async () => {
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/doctor-portal/dashboard') {
      return {
        ok: true,
        json: async () => ({
          doctor: { id: 'doctor-1', doctorName: 'Dr. Example', doctorSpecialistName: 'Cardiology' },
          appointments: [appointment],
          waitingCount: 1,
          followUpCount: 1,
          fromDate: '2026-10-02',
        }),
      };
    }
    if (path === '/doctor-portal/patients/PT-123') {
      return {
        ok: true,
        json: async () => ({
          patient: { patientId: 'PT-123', patientName: 'Aadi Patient', patientAge: '38', gender: 'Other' },
          consultations: [{ id: 'history-1', diagnosis: 'Prior condition', createdAt: '2026-09-01T10:00:00Z' }],
        }),
      };
    }
    if (path === '/doctor-portal/consultations' && options.method === 'POST') {
      return { ok: true, json: async () => ({ id: 'consultation-1' }) };
    }
    if (path === '/users/logout') return { ok: true, json: async () => ({}) };
    throw new Error(`Unexpected API request: ${path}`);
  });

  render(<DoctorDashboard />);
  expect(await screen.findByText('Dr. Example')).toBeInTheDocument();
  expect(screen.getByText('Doctor appointments')).toBeInTheDocument();
  expect(screen.getByText('2026-10-02')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open patient' }));

  expect(await screen.findByText('Prior condition')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Symptoms'), { target: { value: 'Headache' } });
  fireEvent.change(screen.getByLabelText('Blood pressure'), { target: { value: '120/80 mmHg' } });
  fireEvent.change(screen.getByLabelText('Diagnosis'), { target: { value: 'Tension headache' } });
  fireEvent.change(screen.getByLabelText('Prescription'), { target: { value: 'Rest and hydration' } });
  fireEvent.change(screen.getByLabelText('Lab / diagnostic orders'), { target: { value: 'CBC\nCRP' } });
  fireEvent.change(screen.getByLabelText('Doctor notes'), { target: { value: 'Review if symptoms persist' } });
  fireEvent.click(screen.getByRole('button', { name: 'Complete consultation' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/doctor-portal/consultations', expect.anything()));
  const [, request] = apiFetch.mock.calls.find(([path]) => path === '/doctor-portal/consultations');
  expect(request.method).toBe('POST');
  expect(JSON.parse(request.body)).toEqual({
    symptoms: 'Headache',
    bloodPressure: '120/80 mmHg',
    pulse: '',
    temperature: '',
    oxygenSaturation: '',
    weight: '',
    diagnosis: 'Tension headache',
    prescription: 'Rest and hydration',
    labOrders: ['CBC', 'CRP'],
    doctorNotes: 'Review if symptoms persist',
    followUpDate: '',
    appointmentId: 'appointment-1',
  });
  expect(await screen.findByRole('status')).toHaveTextContent('Consultation saved for Aadi Patient');
});

test('explains when a restarted backend has expired the doctor session', async () => {
  apiFetch.mockResolvedValue({
    ok: false,
    status: 401,
    json: async () => ({ error: 'Unauthorized' }),
  });

  render(<DoctorDashboard />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Your doctor session has expired. Please sign in again.',
  );
});

test('shows the backend reason when the doctor profile is not linked', async () => {
  apiFetch.mockResolvedValue({
    ok: false,
    status: 409,
    json: async () => ({ message: 'No doctor profile is linked to this account. Contact your hospital administrator.' }),
  });

  render(<DoctorDashboard />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'No doctor profile is linked to this account. Contact your hospital administrator.',
  );
});
