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

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

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
    if (path === '/doctor-portal/medications') {
      return {
        ok: true,
        json: async () => [{
          id: 'med-1',
          name: 'Amoxicillin',
          department: 'Pediatrics',
          strength: '250 mg',
          dosageForm: 'Capsule',
          quantityAvailable: 30,
        }],
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
      return {
        ok: true,
        json: async () => ({
          consultation: { id: 'consultation-1' },
          medicationPrescription: {
            id: 'rx-1',
            patientName: 'Aadi Patient',
            patientId: 'PT-123',
            doctorName: 'Dr. Example',
            diagnosis: 'Tension headache',
            medications: [{
              medicationId: 'med-1',
              name: 'Amoxicillin',
              strength: '250 mg',
              dosageForm: 'Capsule',
              dose: '1 capsule',
              route: 'Oral',
              frequency: 'Twice daily',
              duration: '5 days',
              quantity: 10,
            }],
          },
        }),
      };
    }
    if (path === '/users/logout') return { ok: true, json: async () => ({}) };
    throw new Error(`Unexpected API request: ${path}`);
  });

  render(<DoctorDashboard />);
  expect(await screen.findByText('Dr. Example')).toBeInTheDocument();
  expect(screen.getByText('Doctor appointments')).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'My payroll' })).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'My payslips' })).toHaveAttribute('href', '/PayrollPortal');
  expect(screen.getByText('2026-10-02')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Open patient' }));

  expect(await screen.findByText('Prior condition')).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Symptoms'), { target: { value: 'Headache' } });
  fireEvent.change(screen.getByLabelText('Blood pressure'), { target: { value: '120/80 mmHg' } });
  fireEvent.change(screen.getByLabelText('Diagnosis'), { target: { value: 'Tension headache' } });
  fireEvent.change(screen.getByLabelText('Prescription'), { target: { value: 'Rest and hydration' } });
  fireEvent.click(screen.getByRole('button', { name: 'Add medicine' }));
  fireEvent.change(screen.getByLabelText('Medicine'), { target: { value: 'med-1' } });
  fireEvent.change(screen.getByLabelText('Dose'), { target: { value: '1 capsule' } });
  fireEvent.change(screen.getByLabelText('Frequency'), { target: { value: 'Twice daily' } });
  fireEvent.change(screen.getByLabelText('Duration'), { target: { value: '5 days' } });
  fireEvent.change(screen.getByLabelText('Total quantity'), { target: { value: '10' } });
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
    medicationOrders: [{
      medicationId: 'med-1',
      dose: '1 capsule',
      route: 'Oral',
      frequency: 'Twice daily',
      duration: '5 days',
      quantity: 10,
      instructions: '',
    }],
  });
  expect(await screen.findByRole('status')).toHaveTextContent('Consultation saved for Aadi Patient');
  const printWindow = {
    document: { open: jest.fn(), write: jest.fn(), close: jest.fn() },
    focus: jest.fn(),
    setTimeout: jest.fn((callback) => callback()),
    print: jest.fn(),
    close: jest.fn(),
  };
  const openPrintWindow = jest.spyOn(window, 'open').mockReturnValue(printWindow);
  fireEvent.click(await screen.findByRole('button', { name: 'Print prescription' }));
  expect(openPrintWindow).toHaveBeenCalledWith('', '_blank');
  expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('MEDCARE HOSPITAL'));
  expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('Aadi Patient'));
  expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('Amoxicillin'));
  expect(printWindow.print).toHaveBeenCalled();
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

test('shows the linked doctor ID and department and searches only assigned patients', async () => {
  apiFetch.mockImplementation(async (path) => {
    if (path === '/doctor-portal/dashboard') {
      return {
        ok: true,
        json: async () => ({
          doctor: {
            id: 'doctor-profile-1',
            employeeId: 'DT-12345678',
            doctorName: 'Dr. Example',
            doctorDestination: 'Cardiology',
          },
          appointments: [
            appointment,
            { ...appointment, id: 'appointment-2', patientId: 'PT-456', patientName: 'Second Patient' },
          ],
          waitingCount: 2,
          followUpCount: 0,
          fromDate: '2026-10-02',
        }),
      };
    }
    if (path === '/doctor-portal/medications') {
      return { ok: true, json: async () => [] };
    }
    throw new Error(`Unexpected API request: ${path}`);
  });

  render(<DoctorDashboard />);

  expect(await screen.findByText('DT-12345678')).toBeInTheDocument();
  expect(screen.getByText('Cardiology')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Assigned patients' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Aadi Patient/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Second Patient/ })).toBeInTheDocument();

  fireEvent.change(screen.getByRole('searchbox', { name: 'Find patient' }), {
    target: { value: 'pt-456' },
  });

  expect(screen.queryByRole('button', { name: /Aadi Patient/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Second Patient/ })).toBeInTheDocument();
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
