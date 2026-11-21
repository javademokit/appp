import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ReportViewer from './ReportViewer';
import { printAppointmentReceipt } from './appointmentReceipt';

jest.mock('../API/api', () => ({
  apiFetch: (...args) => global.fetch(...args),
}));

jest.mock('./appointmentReceipt', () => ({
  printAppointmentReceipt: jest.fn(() => true),
}));

const patientAppointment = {
  id: 'appointment-1',
  appointmentNumber: 'APT-20',
  tokenNumber: 20,
  patientName: 'A Patient',
  patientId: 'PT-001',
  mobileNo: '9876543210',
  doctor: 'Dr. Example',
  date: '2030-01-03',
  time: '10:00',
  reason: 'Annual checkup',
  fee: '500.00',
};

beforeEach(() => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [
      patientAppointment,
      {
        ...patientAppointment,
        id: 'appointment-2',
        appointmentNumber: 'APT-21',
        mobileNo: '9123456780',
        patientName: 'Another Patient',
      },
      {
        ...patientAppointment,
        id: 'appointment-3',
        appointmentNumber: 'APT-22',
        date: '2030-01-04',
      },
    ],
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test('searches partial mobile numbers and prints the matching appointment data', async () => {
  render(<ReportViewer username="crm-user" />);

  fireEvent.change(screen.getByRole('combobox', { name: 'Report type' }), {
    target: { value: 'Appointment Receipts' },
  });
  const mobileSearch = await screen.findByLabelText('Patient mobile number');
  await waitFor(() => expect(mobileSearch).toHaveValue(''));
  expect(global.fetch).toHaveBeenCalledWith('/appointments1');

  fireEvent.change(mobileSearch, { target: { value: '9876' } });

  expect(screen.queryByText('APT-20')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(await screen.findByText('APT-20')).toBeInTheDocument();
  expect(screen.getByText('APT-22')).toBeInTheDocument();
  expect(screen.queryByText('APT-21')).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Appointment date (optional)'), {
    target: { value: '2030-01-04' },
  });
  expect(screen.queryByText('APT-22')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(screen.queryByText('APT-20')).not.toBeInTheDocument();
  expect(screen.getByText('APT-22')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Print / Save as PDF' }));

  expect(printAppointmentReceipt).toHaveBeenCalledWith(expect.objectContaining({
    appointmentNumber: 'APT-22',
    date: '2030-01-04',
  }), undefined, 'crm-user');
});

test('normalizes punctuation in a mobile number and reports unmatched searches', async () => {
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => [{ ...patientAppointment, mobileNo: '+91 98765-43210' }],
  });
  render(<ReportViewer />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Report type' }), {
    target: { value: 'Appointment Receipts' },
  });

  const mobileSearch = await screen.findByLabelText('Patient mobile number');
  fireEvent.change(mobileSearch, { target: { value: '000' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));

  expect(await screen.findByText('No appointment receipts found for this mobile number and date.')).toBeInTheDocument();

  fireEvent.change(mobileSearch, { target: { value: '9876' } });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));
  expect(await screen.findByText('APT-20')).toBeInTheDocument();
});

test('requires a valid minimum mobile search before displaying appointments', async () => {
  render(<ReportViewer />);
  fireEvent.change(screen.getByRole('combobox', { name: 'Report type' }), {
    target: { value: 'Appointment Receipts' },
  });

  fireEvent.change(await screen.findByLabelText('Patient mobile number'), {
    target: { value: '12' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Search' }));

  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Enter at least 3 digits of the patient mobile number.'
  );
  expect(screen.queryByText('APT-20')).not.toBeInTheDocument();
});
