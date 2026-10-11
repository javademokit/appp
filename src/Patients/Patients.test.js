import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import Patients from './Patients';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

afterEach(() => jest.clearAllMocks());

test('assigns and persists a selected nurse for an admitted patient', async () => {
  const patient = {
    id: 'patient-db-id',
    patientId: 'PT-100',
    patientName: 'Admitted Patient',
    patientmobileNo: '5551000',
    patientAdmitdate: '2026-10-03',
    patientWardnum: 'Ward 2',
  };
  const nurse = {
    id: 'nurse-account-1',
    userId: 'nurse-one',
    emailId: 'nurse@example.test',
    name: 'Nurse One',
    profileComplete: true,
    status: 'ACTIVE',
  };
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/patients') return { ok: true, json: async () => [patient] };
    if (path === '/nursing/nurses') return { ok: true, json: async () => [nurse] };
    if (path === '/nursing/wards') return { ok: true, json: async () => [] };
    if (path === '/users/me') return { ok: true, json: async () => ({ roles: ['CRM_EXECUTIVE'] }) };
    if (path === '/nursing/patients/PT-100/nurse' && options.method === 'PUT') {
      return {
        ok: true,
        json: async () => ({ ...patient, patientNurseId: nurse.id, patientNurseassign: nurse.userId }),
      };
    }
    throw new Error(`Unexpected API request: ${path}`);
  });

  render(<Patients />);
  fireEvent.change(await screen.findByLabelText('Nurse for Admitted Patient'), { target: { value: nurse.id } });
  fireEvent.click(screen.getByRole('button', { name: 'Assign nurse' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/nursing/patients/PT-100/nurse', expect.objectContaining({
    method: 'PUT',
    body: JSON.stringify({ nurseId: nurse.id }),
  })));
  expect(await screen.findByRole('status')).toHaveTextContent('nurse-one assigned to Admitted Patient (PT-100)');
});

test('shows and searches patient records even when ward and nurse data cannot load', async () => {
  const patients = [
    { id: 'patient-1', patientId: 'PT-101', patientName: 'Ravi Kumar', patientmobileNo: '5551001' },
    { id: 'patient-2', patientId: 'PT-102', patientName: 'Shyamlal Yadav', patientmobileNo: '5551002' },
  ];
  apiFetch.mockImplementation(async (path) => {
    if (path === '/patients') return { ok: true, json: async () => patients };
    if (path === '/nursing/nurses') return { ok: false, json: async () => ({ message: 'Nurse service unavailable' }) };
    if (path === '/nursing/wards') return { ok: false, json: async () => ({ message: 'Ward service unavailable' }) };
    if (path === '/users/me') return { ok: false, json: async () => ({ message: 'User lookup unavailable' }) };
    throw new Error(`Unexpected API request: ${path}`);
  });

  render(<Patients />);

  expect(await screen.findByText('Ravi Kumar')).toBeInTheDocument();
  expect(screen.getByText('Patient ID: PT-101')).toBeInTheDocument();
  expect(screen.getByText('Patient ID: PT-102')).toBeInTheDocument();
  expect(screen.getByText('Showing 2 of 2 patient records')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Patient records loaded');

  fireEvent.change(screen.getByRole('textbox', { name: 'Search patients' }), { target: { value: 'PT-102' } });
  expect(screen.getByText('Shyamlal Yadav')).toBeInTheDocument();
  expect(screen.queryByText('Ravi Kumar')).not.toBeInTheDocument();
  expect(screen.getByText('Showing 1 of 2 patient records')).toBeInTheDocument();
});

test('filters admission rooms by ward and room type and clears an outdated bed selection', async () => {
  const patient = { patientId: 'PT-300', patientName: 'Admission Candidate', gender: 'FEMALE' };
  const wards = [
    {
      id: 'ward-a', name: 'Ward A', type: 'GENERAL', beds: [
        { id: 'bed-a1', bedNumber: '101-A', status: 'VACANT', room: { id: 'room-a1', roomNumber: '101', acType: 'AC', category: 'PRIVATE', status: 'ACTIVE' } },
        { id: 'bed-a2', bedNumber: '102-A', status: 'VACANT', room: { id: 'room-a2', roomNumber: '102', acType: 'NON_AC', category: 'GENERAL', status: 'ACTIVE' } },
      ],
    },
    {
      id: 'ward-b', name: 'Ward B', type: 'ICU', beds: [
        { id: 'bed-b1', bedNumber: '201-A', status: 'VACANT', room: { id: 'room-b1', roomNumber: '201', acType: 'AC', category: 'ICU', status: 'ACTIVE' } },
      ],
    },
  ];
  apiFetch.mockImplementation(async (path) => {
    if (path === '/patients') return { ok: true, json: async () => [patient] };
    if (path === '/nursing/nurses') return { ok: true, json: async () => [] };
    if (path === '/nursing/wards') return { ok: true, json: async () => wards };
    if (path === '/users/me') return { ok: true, json: async () => ({ roles: ['CRM_EXECUTIVE'] }) };
    throw new Error(`Unexpected API request: ${path}`);
  });

  render(<Patients />);
  await screen.findByText('Admission Candidate');
  fireEvent.click(screen.getByRole('button', { name: 'Admit existing patient' }));
  fireEvent.change(screen.getByRole('combobox', { name: /Patient/ }), { target: { value: patient.patientId } });
  fireEvent.change(screen.getByLabelText('Ward / unit'), { target: { value: 'ward-a' } });
  fireEvent.change(screen.getByLabelText('Preferred AC type'), { target: { value: 'AC' } });

  const roomSelect = screen.getByLabelText('Available room');
  expect(roomSelect).toHaveTextContent('Room 101');
  expect(roomSelect).not.toHaveTextContent('Room 102');
  fireEvent.change(screen.getByLabelText('Room type'), { target: { value: 'PRIVATE' } });
  fireEvent.change(roomSelect, { target: { value: 'room-a1' } });
  fireEvent.change(screen.getByLabelText('Available bed'), { target: { value: 'bed-a1' } });
  expect(screen.getByLabelText('Available bed')).toHaveValue('bed-a1');

  fireEvent.change(screen.getByLabelText('Ward / unit'), { target: { value: 'ward-b' } });
  expect(screen.getByLabelText('Room type')).toHaveValue('');
  expect(screen.getByLabelText('Available room')).toHaveTextContent('Room 201');
  expect(screen.getByLabelText('Available bed')).toHaveValue('');
  expect(screen.getByLabelText('Available bed')).toBeDisabled();
});

test('explains when patient records cannot load because the staff session expired', async () => {
  apiFetch.mockImplementation(async (path) => {
    if (path === '/patients') return {
      ok: false,
      status: 401,
      json: async () => ({}),
    };
    if (path === '/nursing/nurses' || path === '/nursing/wards' || path === '/users/me') {
      return { ok: false, status: 401, json: async () => ({}) };
    }
    throw new Error(`Unexpected API request: ${path}`);
  });

  render(<Patients />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Your session has expired or you are not signed in. Sign in again to load patient records.',
  );
});

test('explains when the signed-in staff member lacks patient-directory access', async () => {
  apiFetch.mockImplementation(async (path) => {
    if (path === '/patients') return {
      ok: false,
      status: 403,
      json: async () => ({}),
    };
    if (path === '/nursing/nurses' || path === '/nursing/wards' || path === '/users/me') {
      return { ok: false, status: 401, json: async () => ({}) };
    }
    throw new Error(`Unexpected API request: ${path}`);
  });

  render(<Patients />);

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Your account does not have permission to view patient records. Contact an administrator if you need access.',
  );
});
