import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import Doctors from './Doctors';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

afterEach(() => jest.clearAllMocks());

test('shows the HR-created doctor profile and schedule in the doctor roster', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => [{
      id: 'doctor-profile-1',
      employeeId: 'DT-1234ABCD',
      doctorName: 'Mira Patel',
      doctorSpecialistName: 'Cardiology',
      doctorDestination: 'Cardiology',
      doctorAvailabletime: ['09:00', '09:30'],
      doctorfee: 650,
    }],
  });

  render(<Doctors />);

  expect(await screen.findAllByText('Mira Patel')).toHaveLength(2);
  expect(screen.getByText('DT-1234ABCD')).toBeInTheDocument();
  expect(screen.getAllByText('Cardiology')).toHaveLength(3);
  expect(screen.getAllByText('09:00')).toHaveLength(2);
  expect(screen.getAllByText('09:30')).toHaveLength(2);
});

test('updates the selected HR doctor employee schedule without creating a duplicate doctor', async () => {
  const employee = {
    id: 'employee-1',
    employeeCode: 'DT-1234ABCD',
    doctorName: 'Mira Patel',
    doctorSpecialistName: 'Cardiology',
    doctorMobileNo: '5551234567',
    doctorDestination: 'Cardiology',
    doctorfee: 650,
  };
  const savedDoctor = {
    id: 'doctor-profile-1',
    employeeId: employee.employeeCode,
    doctorName: employee.doctorName,
    doctorSpecialistName: employee.doctorSpecialistName,
    doctorAvailabletime: ['10:00'],
    doctorfee: 650,
  };
  apiFetch.mockImplementation((path, options) => {
    if (path === '/doctors') return Promise.resolve({ ok: true, json: async () => [] });
    if (path === '/doctors/employees') return Promise.resolve({ ok: true, json: async () => [employee] });
    if (path === '/doctors/employees/employee-1/schedule') {
      return Promise.resolve({ ok: true, json: async () => savedDoctor });
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });

  render(<Doctors />);
  expect(await screen.findByText('No doctors match this search.')).toBeInTheDocument();
  fireEvent.click(await screen.findByRole('button', { name: /add doctor/i }));
  fireEvent.change(screen.getByLabelText('Doctor employee'), { target: { value: employee.id } });
  fireEvent.change(screen.getByLabelText('Available time slots'), { target: { value: '10:00' } });
  fireEvent.click(screen.getByRole('button', { name: /add time/i }));
  fireEvent.click(screen.getByRole('button', { name: /save doctor/i }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
    '/doctors/employees/employee-1/schedule',
    {
      method: 'PUT',
      body: JSON.stringify({ availableTimes: ['10:00'], consultationFee: 650 }),
    },
  ));
  expect(await screen.findByText('Doctor schedule updated successfully!')).toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalledWith('/doctors', expect.objectContaining({ method: 'POST' }));
});

test('keeps manual doctor creation available for non-employee clinicians', async () => {
  apiFetch.mockImplementation((path, options) => {
    if (path === '/doctors') {
      if (options?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'manual-doctor', doctorName: 'Sam Lee', doctorAvailabletime: ['11:00'] }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    }
    if (path === '/doctors/employees') return Promise.resolve({ ok: true, json: async () => [] });
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });

  render(<Doctors />);
  fireEvent.click(await screen.findByRole('button', { name: /add doctor/i }));
  fireEvent.change(screen.getByLabelText('Full name'), { target: { value: 'Sam Lee' } });
  fireEvent.change(screen.getByLabelText('Specialty'), { target: { value: 'Neurology' } });
  fireEvent.change(screen.getByLabelText('Available time slots'), { target: { value: '11:00' } });
  fireEvent.click(screen.getByRole('button', { name: /add time/i }));
  fireEvent.click(screen.getByRole('button', { name: /save doctor/i }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/doctors', expect.objectContaining({
    method: 'POST',
  })));
  expect(await screen.findByText('Doctor added successfully!')).toBeInTheDocument();
});
