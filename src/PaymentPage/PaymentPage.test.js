import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import PaymentPage from './PaymentPage';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

const invoice = {
  id: 'invoice-1',
  invoiceNumber: 'INV-123',
  appointmentId: 'appointment-1',
  patientId: 'PT-123',
  patientName: 'Aadi Patient',
  doctorName: 'Dr. Example',
  service: 'Consultation',
  amount: 500,
  paidAmount: 0,
  balanceDue: 500,
  status: 'PENDING',
  payments: [],
};

afterEach(() => jest.clearAllMocks());

test('loads real appointment invoices and records an actual cash payment', async () => {
  let paid = false;
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/billing/appointment-invoices' && !options.method) {
      return { ok: true, json: async () => [paid ? {
        ...invoice, paidAmount: 500, balanceDue: 0, status: 'PAID',
      } : invoice] };
    }
    if (path === '/billing/appointment-invoices/gateways') {
      return { ok: true, json: async () => ({ RAZORPAY: false, PAYU: false, STRIPE: false }) };
    }
    if (path === '/billing/appointment-invoices/invoice-1/payments' && options.method === 'POST') {
      paid = true;
      return { ok: true, json: async () => ({ ...invoice, paidAmount: 500, balanceDue: 0, status: 'PAID' }) };
    }
    throw new Error(`Unexpected API request: ${path}`);
  });

  render(<PaymentPage />);
  expect(await screen.findByText(/INV-123/)).toBeInTheDocument();
  expect(screen.getByText('Aadi Patient')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Record received payment' }));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm received payment' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
    '/billing/appointment-invoices/invoice-1/payments',
    expect.objectContaining({
      method: 'POST',
      body: '{"amount":500,"method":"CASH"}',
    }),
  ));
  expect(await screen.findByText('Completed')).toBeInTheDocument();
});
