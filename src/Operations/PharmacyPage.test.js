import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import PharmacyPage from './PharmacyPage';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));
jest.mock('../PaymentPage/paymentGatewayCheckout', () => ({
  startPharmacyCheckout: jest.fn(),
}));

const prescription = {
  id: 'rx-1',
  patientId: 'PT-1',
  patientName: 'Aadi Patient',
  doctorName: 'Dr Example',
  diagnosis: 'Cold',
  status: 'PENDING',
  medications: [{ medicationId: 'med-1', name: 'Medicine A', quantity: 2 }],
};
const pendingInvoice = {
  id: 'invoice-1',
  invoiceNumber: 'PH-123',
  referenceKey: 'PRESCRIPTION:rx-1',
  referenceType: 'PRESCRIPTION',
  referenceId: 'rx-1',
  patientId: 'PT-1',
  patientName: 'Aadi Patient',
  amount: 50,
  paidAmount: 0,
  balanceDue: 50,
  status: 'PENDING',
  items: [{ medicationId: 'med-1', medicationName: 'Medicine A', quantity: 2, unitPrice: 25, lineTotal: 50 }],
};

test('pharmacy records cash against a prescription bill before enabling dispense', async () => {
  let invoice = pendingInvoice;
  let currentPrescription = prescription;
  apiFetch.mockImplementation(async (path, options = {}) => {
    if (path === '/pharmacy/medications' || path === '/pharmacy/purchase-orders'
      || path === '/pharmacy/prescription-issues') return { ok: true, json: async () => [] };
    if (path === '/pharmacy/prescriptions') {
      return { ok: true, json: async () => [currentPrescription] };
    }
    if (path === '/pharmacy/invoices') return { ok: true, json: async () => [invoice] };
    if (path === '/pharmacy/invoices/gateways') {
      return { ok: true, json: async () => ({ RAZORPAY: false }) };
    }
    if (path === '/pharmacy/invoices/invoice-1/payments' && options.method === 'POST') {
      expect(JSON.parse(options.body)).toEqual({ amount: '50.00', method: 'CASH' });
      invoice = { ...invoice, paidAmount: 50, balanceDue: 0, status: 'PAID' };
      return { ok: true, json: async () => invoice };
    }
    if (path === '/pharmacy/prescriptions/rx-1/dispense' && options.method === 'POST') {
      currentPrescription = { ...currentPrescription, status: 'DISPENSED' };
      return { ok: true, json: async () => currentPrescription };
    }
    throw new Error(`Unexpected API request: ${path}`);
  });

  render(<PharmacyPage />);

  fireEvent.click(await screen.findByRole('tab', { name: 'Pharmacy billing (1)' }));
  expect(await screen.findByText('PH-123')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Collect cash' }));
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
    '/pharmacy/invoices/invoice-1/payments',
    expect.objectContaining({ method: 'POST' }),
  ));

  fireEvent.click(screen.getByRole('tab', { name: /Doctor prescriptions/ }));
  const dispenseButton = await screen.findByRole('button', { name: 'Dispense all' });
  expect(dispenseButton).toBeEnabled();
  fireEvent.click(dispenseButton);
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
    '/pharmacy/prescriptions/rx-1/dispense',
    { method: 'POST' },
  ));
  expect(await screen.findByText('All medicines on the doctor prescription were dispensed and stock updated.')).toBeInTheDocument();
});
