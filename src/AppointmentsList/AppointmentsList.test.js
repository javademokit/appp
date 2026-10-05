import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import AppointmentsList from './AppointmentsList';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

afterEach(() => jest.clearAllMocks());

const appointment = (overrides = {}) => ({
  id: 'appointment-1',
  patientId: 'PT-001',
  patientName: 'A Patient',
  doctor: 'Dr. Example',
  date: '2030-01-03',
  time: '10:00 AM',
  appointmentStatus: 'pending',
  invoiceId: 'invoice-1',
  billingStatus: 'PENDING',
  balanceDue: '500.00',
  ...overrides,
});

test('reception records cash before confirming an appointment with an outstanding balance', async () => {
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/appointments1' && !options.method) {
      return { ok: true, json: async () => [appointment()] };
    }
    return { ok: true, json: async () => ({ message: 'ok' }) };
  });

  render(<AppointmentsList />);

  fireEvent.click((await screen.findAllByRole('button', { name: /Cash received/ }))[0]);

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
    '/appointments1/appointment-1',
    expect.objectContaining({ method: 'PATCH' }),
  ));
  const calls = apiFetch.mock.calls;
  const paymentCall = calls.findIndex(([path]) => path === '/billing/appointment-invoices/invoice-1/payments');
  const confirmationCall = calls.findIndex(([path]) => path === '/appointments1/appointment-1');
  expect(paymentCall).toBeGreaterThan(-1);
  expect(confirmationCall).toBeGreaterThan(paymentCall);
  expect(JSON.parse(calls[paymentCall][1].body)).toEqual({ amount: 500, method: 'CASH' });
  expect(JSON.parse(calls[confirmationCall][1].body)).toEqual({ status: 'confirmed' });
  expect(await screen.findByText('Cash payment recorded and appointment confirmed.')).toBeInTheDocument();
});

test('reception can confirm a no-charge appointment without recording a payment', async () => {
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/appointments1' && !options.method) {
      return { ok: true, json: async () => [appointment({
        invoiceId: 'invoice-free',
        billingStatus: 'NO_CHARGE',
        balanceDue: '0.00',
      })] };
    }
    return { ok: true, json: async () => ({ message: 'ok' }) };
  });

  render(<AppointmentsList />);

  fireEvent.click((await screen.findAllByRole('button', { name: 'Confirm' }))[0]);

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
    '/appointments1/appointment-1',
    expect.objectContaining({ method: 'PATCH' }),
  ));
  expect(apiFetch).not.toHaveBeenCalledWith(
    '/billing/appointment-invoices/invoice-free/payments',
    expect.anything(),
  );
});

test('does not confirm when recording cash fails and refreshes the appointment list', async () => {
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/appointments1' && !options.method) {
      return { ok: true, json: async () => [appointment()] };
    }
    if (path === '/billing/appointment-invoices/invoice-1/payments') {
      return { ok: false, json: async () => ({ message: 'Invoice has no outstanding balance' }) };
    }
    return { ok: true, json: async () => ({ message: 'ok' }) };
  });

  render(<AppointmentsList />);

  fireEvent.click((await screen.findAllByRole('button', { name: /Cash received/ }))[0]);

  expect(await screen.findByText('Invoice has no outstanding balance')).toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalledWith(
    '/appointments1/appointment-1',
    expect.objectContaining({ method: 'PATCH' }),
  );
  expect(apiFetch.mock.calls.filter(([path, options]) => path === '/appointments1' && !options?.method))
    .toHaveLength(2);
});
