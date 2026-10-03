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
