import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import UserLogin from './UserLogin ';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));
jest.mock('react-router-dom', () => ({
  Link: 'a',
  useNavigate: () => (path) => globalThis.history.pushState({}, '', path),
}), { virtual: true });

function renderLogin(portal) {
  return render(<UserLogin portal={portal} />);
}

function mockSuccessfulLogin(roles) {
  apiFetch.mockImplementation(async (path) => {
    if (path === '/users/login') {
      return { ok: true, json: async () => ({ success: true, user: { roles } }) };
    }
    return { ok: true, json: async () => ({}) };
  });
}

afterEach(() => {
  jest.clearAllMocks();
  window.history.pushState({}, '', '/');
});

test('patient login directs patient accounts to the patient portal', async () => {
  mockSuccessfulLogin(['PATIENT']);
  renderLogin('patient');
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'patient@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

  await waitFor(() => expect(window.location.pathname).toBe('/PatientPortal'));
});

test('hospital CRM login directs CRM staff to the appointment-capable dashboard', async () => {
  mockSuccessfulLogin(['CRM_EXECUTIVE']);
  renderLogin('hospital');
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'crm@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

  await waitFor(() => expect(window.location.pathname).toBe('/HospitalDashboard'));
});

test('doctor login directs doctor accounts to the clinical workspace', async () => {
  mockSuccessfulLogin(['DOCTOR']);
  renderLogin('doctor');
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'doctor@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

  await waitFor(() => expect(window.location.pathname).toBe('/DoctorDashboard'));
});

test('doctor login rejects accounts without the doctor role', async () => {
  mockSuccessfulLogin(['RECEPTIONIST']);
  renderLogin('doctor');
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'staff@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('does not have doctor portal access');
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/logout', { method: 'POST' }));
});

test('patient login rejects staff-only accounts and clears the session', async () => {
  mockSuccessfulLogin(['RECEPTIONIST']);
  renderLogin('patient');
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'staff@example.test' } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'test-password' } });
  fireEvent.click(screen.getByRole('button', { name: 'Log In' }));

  expect(await screen.findByRole('alert')).toHaveTextContent('does not have patient portal access');
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/users/logout', { method: 'POST' }));
});
