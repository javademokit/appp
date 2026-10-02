import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import StaffShiftsPage from './StaffShiftsPage';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

afterEach(() => jest.clearAllMocks());

test('records doctor check-in and check-out against the scheduled shift', async () => {
  const date = new Date();
  const shiftDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  let currentShift = {
    id: 'shift-1', staffId: 'doctor-1', staffName: 'Dr Example', staffRole: 'Doctor',
    department: 'General Medicine', shiftDate, startTime: '08:00', endTime: '16:00',
    status: 'SCHEDULED', checkInAt: null, checkOutAt: null,
  };
  apiFetch.mockImplementation(async (path, options = {}) => {
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
