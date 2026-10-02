import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { apiFetch } from '../API/api';
import UserAccessPage from './UserAccessPage';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

afterEach(() => jest.clearAllMocks());

test('hospital administrator can assign a staff role to another registered account', async () => {
  const accounts = [
    { id: 'account-admin', userId: 'admin-one', emailId: 'admin@example.test', roles: ['HOSPITAL_ADMIN'], active: true },
    { id: 'account-patient', userId: 'staff-one', emailId: 'staff@example.test', roles: ['PATIENT'], active: true },
  ];
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/users/staff-one/roles' && options.method === 'PUT') {
      const assigned = JSON.parse(options.body).roles;
      return { ok: true, json: async () => ({ userId: 'staff-one', roles: assigned }) };
    }
    if (path === '/users/me') {
      return { ok: true, json: async () => ({ username: 'admin-one', roles: ['HOSPITAL_ADMIN'] }) };
    }
    if (path === '/doctors') return { ok: true, json: async () => [] };
    if (path === '/users') return { ok: true, json: async () => accounts };
    return { ok: false, json: async () => ({ message: 'Unexpected request' }) };
  });

  render(<UserAccessPage />);

  const staffRow = (await screen.findByText('staff-one')).closest('tr');
  fireEvent.click(within(staffRow).getByRole('checkbox', { name: 'DOCTOR' }));
  fireEvent.click(staffRow.querySelector('button'));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/staff-one/roles', {
    method: 'PUT',
    body: JSON.stringify({ roles: ['PATIENT', 'DOCTOR'] }),
  }));
  expect(await screen.findByText(/Access roles updated for staff-one/)).toBeInTheDocument();
});

test('hospital administrator can create a CRM staff account directly', async () => {
  const accounts = [
    { id: 'account-admin', userId: 'admin-one', emailId: 'admin@example.test', roles: ['HOSPITAL_ADMIN'], active: true },
  ];
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/users/staff' && options.method === 'POST') {
      const createdAccount = {
        id: 'account-crm',
        ...JSON.parse(options.body),
        active: true,
      };
      accounts.push(createdAccount);
      return {
        ok: true,
        json: async () => ({ userId: createdAccount.userId }),
      };
    }
    if (path === '/users/me') {
      return { ok: true, json: async () => ({ username: 'admin-one', roles: ['HOSPITAL_ADMIN'] }) };
    }
    if (path === '/doctors') return { ok: true, json: async () => [] };
    if (path === '/users') return { ok: true, json: async () => accounts };
    return { ok: false, json: async () => ({ message: 'Unexpected request' }) };
  });

  render(<UserAccessPage />);
  fireEvent.change(await screen.findByLabelText('User ID'), { target: { value: 'crm-one' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'crm@example.test' } });
  fireEvent.change(screen.getByLabelText('Mobile number'), { target: { value: '5551234567' } });
  fireEvent.change(screen.getByLabelText('Temporary password'), { target: { value: 'StrongStaffPass2026' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/staff', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({
      userId: 'crm-one',
      emailId: 'crm@example.test',
      mobileNo: '5551234567',
      password: 'StrongStaffPass2026',
      roles: ['CRM_EXECUTIVE'],
    }),
  })));
  expect(await screen.findByText(/Staff account crm-one created/)).toBeInTheDocument();
  expect(await screen.findByText('crm-one')).toBeInTheDocument();
});

test('administrator can create a doctor login and availability profile together', async () => {
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/users/staff' && options.method === 'POST') {
      return { ok: true, json: async () => ({ userId: 'doctor-one' }) };
    }
    if (path === '/users/me') {
      return { ok: true, json: async () => ({ username: 'admin-one', roles: ['HOSPITAL_ADMIN'] }) };
    }
    if (path === '/doctors') return { ok: true, json: async () => [] };
    if (path === '/users') return { ok: true, json: async () => [] };
    return { ok: false, json: async () => ({ message: 'Unexpected request' }) };
  });

  render(<UserAccessPage />);
  fireEvent.change(await screen.findByLabelText('User ID'), { target: { value: 'doctor-one' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'doctor@example.test' } });
  fireEvent.change(screen.getByLabelText('Temporary password'), { target: { value: 'StrongDoctorPass2026' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'DOCTOR' }));
  fireEvent.change(screen.getByLabelText('Doctor profile'), { target: { value: 'new' } });
  fireEvent.change(screen.getByLabelText('Doctor full name'), { target: { value: 'Dr. Example' } });
  fireEvent.change(screen.getByLabelText('Specialty'), { target: { value: 'Cardiology' } });
  fireEvent.change(screen.getByLabelText('Available time slots'), { target: { value: '09:00, 09:30' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/staff', {
    method: 'POST',
    body: JSON.stringify({
      userId: 'doctor-one',
      emailId: 'doctor@example.test',
      mobileNo: '',
      password: 'StrongDoctorPass2026',
      roles: ['CRM_EXECUTIVE', 'DOCTOR'],
      doctorProfile: {
        doctorName: 'Dr. Example',
        doctorSpecialistName: 'Cardiology',
        doctorMobileNo: '',
        doctorDestination: '',
        doctorAvailabletime: ['09:00', '09:30'],
        doctorfee: 0,
      },
    }),
  }));
  expect(await screen.findByText(/Staff account doctor-one created/)).toBeInTheDocument();
});

test('shows backend doctor-profile validation details instead of a generic request error', async () => {
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/users/staff' && options.method === 'POST') {
      return {
        ok: false,
        status: 400,
        text: async () => JSON.stringify({
          errors: [{ field: 'doctorProfile.doctorAvailabletime', defaultMessage: 'must not be empty' }],
        }),
      };
    }
    if (path === '/users/me') {
      return { ok: true, text: async () => JSON.stringify({ username: 'admin-one', roles: ['HOSPITAL_ADMIN'] }) };
    }
    if (path === '/doctors') return { ok: true, text: async () => '[]' };
    if (path === '/users') return { ok: true, text: async () => '[]' };
    return { ok: false, status: 404, text: async () => '{}' };
  });

  render(<UserAccessPage />);
  fireEvent.change(await screen.findByLabelText('User ID'), { target: { value: 'doctor-one' } });
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'doctor@example.test' } });
  fireEvent.change(screen.getByLabelText('Temporary password'), { target: { value: 'StrongDoctorPass2026' } });
  fireEvent.click(screen.getByRole('checkbox', { name: 'DOCTOR' }));
  fireEvent.change(screen.getByLabelText('Doctor profile'), { target: { value: 'new' } });
  fireEvent.change(screen.getByLabelText('Doctor full name'), { target: { value: 'Dr. Example' } });
  fireEvent.change(screen.getByLabelText('Specialty'), { target: { value: 'Cardiology' } });
  fireEvent.change(screen.getByLabelText('Available time slots'), { target: { value: '09:00' } });
  fireEvent.click(screen.getByRole('button', { name: 'Create staff account' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('must not be empty');
  expect(screen.queryByText('Request failed')).not.toBeInTheDocument();
});
