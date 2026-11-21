import { fireEvent, render, screen } from '@testing-library/react';
import { apiFetch } from '../API/api';
import DoctorProfile from './DoctorProfile';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

afterEach(() => jest.clearAllMocks());

test('loads and displays doctors returned by the hospital directory API', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => [{
      id: 'doctor-profile-1',
      employeeId: 'DT-1234ABCD',
      doctorName: 'Mira Patel',
      doctorSpecialistName: 'Cardiology',
      doctorDestination: 'Heart care',
      doctorMobileNo: '5551234567',
      doctorAvailabletime: ['09:00', '09:30'],
      doctorfee: 650,
    }],
  });

  render(<DoctorProfile />);

  expect(await screen.findByRole('heading', { name: 'Mira Patel' })).toBeInTheDocument();
  expect(screen.getByText('Cardiology')).toBeInTheDocument();
  expect(screen.getByText('Heart care')).toBeInTheDocument();
  expect(screen.getByText('09:00 · 09:30')).toBeInTheDocument();
  expect(screen.getByText('₹650 consultation')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '5551234567' })).toHaveAttribute('href', 'tel:5551234567');
  expect(screen.queryByText('Dr. Alice Smith')).not.toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith('/doctors');
});

test('reports directory errors and displays an empty state for an empty database list', async () => {
  apiFetch.mockResolvedValueOnce({ ok: true, json: async () => [] });
  const { rerender } = render(<DoctorProfile />);
  expect(await screen.findByText('No doctors have been added to the directory yet.')).toBeInTheDocument();

  apiFetch.mockResolvedValueOnce({
    ok: false,
    status: 500,
    json: async () => ({ message: 'Doctor directory is unavailable.' }),
  });
  rerender(<DoctorProfile key="retry" />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Doctor directory is unavailable.');
});
