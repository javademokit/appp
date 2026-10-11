import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import StaffShiftsPage from './StaffShiftsPage';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

afterEach(() => jest.clearAllMocks());

const directoryResponse = (path) => {
  if (path === '/employee-types') return [{ id: 'type-doctor', code: 'DOCTOR', name: 'Doctor', status: 'ACTIVE' },
    { id: 'type-nurse', code: 'NURSE', name: 'Nurse', status: 'ACTIVE' },
    { id: 'type-technician', code: 'TECHNICIAN', name: 'Technician', status: 'ACTIVE' }];
  if (path === '/departments') return [{ id: 'dept-ward-a', code: 'WA', name: 'Ward A', status: 'ACTIVE' }];
  return null;
};

test('records doctor check-in and check-out against the scheduled shift', async () => {
  const date = new Date();
  const shiftDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  let currentShift = {
    id: 'shift-1', staffId: 'doctor-1', staffName: 'Dr Example', staffRole: 'Doctor',
    department: 'General Medicine', shiftDate, startTime: '08:00', endTime: '16:00',
    status: 'SCHEDULED', checkInAt: null, checkOutAt: null,
  };
  apiFetch.mockImplementation(async (path, options = {}) => {
    const directory = directoryResponse(path);
    if (directory) return { ok: true, json: async () => directory };
    if (path.startsWith('/staff/shifts/')) {
      currentShift = options.method === 'POST'
        ? { ...currentShift, status: path.endsWith('check-in') ? 'ON_DUTY' : 'COMPLETED',
          ...(path.endsWith('check-in') ? { checkInAt: new Date().toISOString() } : { checkOutAt: new Date().toISOString() }) }
        : currentShift;
      return { ok: true, json: async () => currentShift };
    }
    return { ok: true, json: async () => [currentShift] };
  });

  render(<StaffShiftsPage />);

  fireEvent.click(await screen.findByRole('button', { name: 'Check in' }));
  expect(await screen.findByRole('button', { name: 'Check out' })).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith('/staff/shifts/shift-1/check-in', { method: 'POST' });

  fireEvent.click(screen.getByRole('button', { name: 'Check out' }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/staff/shifts/shift-1/check-out', { method: 'POST' }));
  expect(await screen.findByText('COMPLETED')).toBeInTheDocument();
});

test('schedules an internal or walk-in nurse using the shared nurse employee ID', async () => {
  apiFetch.mockImplementation(async (path, options = {}) => {
    const directory = directoryResponse(path);
    if (directory) return { ok: true, json: async () => directory };
    if (path === '/nursing/nurses') {
      return { ok: true, json: async () => [
        { employeeCode: 'NUR-100', name: 'Existing Nurse', employmentActive: true, profileComplete: true, status: 'ACTIVE' },
        { employeeCode: 'NR-WK-100', name: 'Walk-in Nurse', employmentActive: true, profileComplete: true, status: 'ACTIVE' },
      ] };
    }
    if (path === '/staff/shifts' && options.method === 'POST') {
      return { ok: true, json: async () => ({}) };
    }
    return { ok: true, json: async () => [] };
  });

  render(<StaffShiftsPage />);
  fireEvent.click(await screen.findByRole('button', { name: /schedule shift/i }));
  fireEvent.change(screen.getByLabelText('Role'), { target: { value: 'Nurse' } });
  fireEvent.change(await screen.findByLabelText('Nurse'), { target: { value: 'NR-WK-100' } });
  expect(screen.getByLabelText('Staff name')).toHaveValue('Walk-in Nurse');
  fireEvent.change(screen.getByLabelText('Staff name'), { target: { value: 'Manual Walk-in Name' } });
  fireEvent.change(screen.getByLabelText('Department'), { target: { value: 'Ward A' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save shift' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/staff/shifts', expect.objectContaining({
    method: 'POST',
    body: expect.stringContaining('"staffId":"NR-WK-100"'),
  })));
  const saveRequest = apiFetch.mock.calls.find(([path, options = {}]) => path === '/staff/shifts' && options.method === 'POST');
  expect(saveRequest[1].body).toContain('"staffRole":"Nurse"');
  expect(saveRequest[1].body).toContain('"staffName":"Manual Walk-in Name"');
  expect(saveRequest[1].body).toContain('"department":"Ward A"');
});
