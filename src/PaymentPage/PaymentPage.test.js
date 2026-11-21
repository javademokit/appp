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

  render(<PaymentPage username="billing.user" />);
  expect(await screen.findByText(/INV-123/)).toBeInTheDocument();
  expect(screen.getByText('Appointment number: Legacy booking')).toBeInTheDocument();
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

test('opens invoice audit details and prints the selected invoice', async () => {
  const secondInvoice = {
    ...invoice,
    id: 'invoice-2',
    invoiceNumber: 'INV-456',
    appointmentNumber: 'APT-456',
    appointmentId: 'c648b286-bd95-4168-a6be-566088a0f8c7',
    patientName: 'Mira Patel',
    patientId: 'PT-456',
    doctorName: 'Dr. Other',
    amount: 800,
    paidAmount: 300,
    balanceDue: 500,
    status: 'PARTIALLY_PAID',
    payments: [{
      id: 'payment-1',
      amount: 300,
      method: 'UPI',
      reference: 'TXN-456',
      receivedBy: 'billing.user',
      status: 'RECEIVED',
      createdAt: '2026-10-15T10:00:00Z',
    }],
  };
  apiFetch.mockImplementation(async (path) => {
    if (path === '/billing/appointment-invoices') {
      return { ok: true, json: async () => [invoice, secondInvoice] };
    }
    if (path === '/billing/appointment-invoices/gateways') {
      return { ok: true, json: async () => ({}) };
    }
    throw new Error(`Unexpected API request: ${path}`);
  });

  const printWindow = {
    document: { open: jest.fn(), write: jest.fn(), close: jest.fn() },
    focus: jest.fn(),
    print: jest.fn(),
    close: jest.fn(),
    setTimeout: (callback) => callback(),
  };
  jest.spyOn(window, 'open').mockReturnValue(printWindow);

  render(<PaymentPage username="billing.user" />);
  expect(await screen.findByText('2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'View invoice INV-456' }));

  const dialog = screen.getByRole('dialog', { name: 'INV-456' });
  expect(dialog).toHaveTextContent('Mira Patel');
  expect(dialog).toHaveTextContent('APT-456');
  expect(dialog).not.toHaveTextContent('c648b286-bd95-4168-a6be-566088a0f8c7');
  expect(dialog).toHaveTextContent('UPI');
  expect(dialog).toHaveTextContent('TXN-456');
  expect(dialog).toHaveTextContent('billing.user');

  fireEvent.click(screen.getByRole('button', { name: 'Print invoice' }));
  expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('INV-456'));
  expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('TXN-456'));
  expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('Printed by:</strong> billing.user'));
  expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('medora_ai_logo.svg'));
  expect(printWindow.document.write).toHaveBeenCalledWith(expect.stringContaining('Signature'));
  expect(printWindow.print).toHaveBeenCalled();
});
