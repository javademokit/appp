import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import AmbulanceBillingPage from './AmbulanceBillingPage';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));
jest.mock('recharts', () => {
  const React = require('react');
  const Container = ({ children }) => <div>{children}</div>;
  return {
    Bar: () => null,
    BarChart: Container,
    CartesianGrid: () => null,
    Legend: () => null,
    ResponsiveContainer: Container,
    Tooltip: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});

const pendingCash = {
  id: 'cash-1',
  bookingNumber: 'AMB-CASH-1',
  branchId: 'branch-a',
  branchName: 'Branch A',
  patientName: 'Cash Patient',
  patientId: 'PT-1',
  paymentMethod: 'CASH',
  paymentStatus: 'PENDING',
  status: 'BOOKED',
  amount: 200000,
  paidAmount: 0,
  refundStatus: 'NOT_REQUIRED',
  refundAmount: 0,
  createdAt: '2026-10-06T10:00:00Z',
  payments: [{ id: 'cash-payment', amount: 200000, method: 'CASH', status: 'PENDING' }],
};

const onlinePaid = {
  id: 'online-1',
  bookingNumber: 'AMB-ONLINE-1',
  branchId: 'branch-a',
  branchName: 'Branch A',
  patientName: 'Online Patient',
  patientId: 'PT-2',
  paymentMethod: 'RAZORPAY',
  paymentStatus: 'PAID',
  status: 'BOOKED',
  amount: 50000,
  paidAmount: 50000,
  refundStatus: 'NOT_REQUIRED',
  refundAmount: 0,
  createdAt: '2026-10-05T10:00:00Z',
  payments: [{ id: 'online-payment', amount: 50000, method: 'RAZORPAY', status: 'RECEIVED', receivedAt: '2026-10-05T10:00:00Z' }],
};

const refunded = {
  id: 'refund-1',
  bookingNumber: 'AMB-REFUND-1',
  branchId: 'branch-a',
  branchName: 'Branch A',
  patientName: 'Refund Patient',
  patientId: 'PT-3',
  paymentMethod: 'CASH',
  paymentStatus: 'REFUNDED',
  status: 'CANCELLED',
  amount: 10000,
  paidAmount: 10000,
  refundStatus: 'REFUNDED',
  refundAmount: 10000,
  refundedAt: '2026-10-06T12:00:00Z',
  createdAt: '2026-10-04T10:00:00Z',
  updatedAt: '2026-10-06T12:00:00Z',
  payments: [{ id: 'refund-payment', amount: 10000, method: 'CASH', status: 'REFUNDED', receivedAt: '2026-10-04T10:00:00Z' }],
};

function response(data, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

test('manually confirms cash and reports gross, refunded and net collections', async () => {
  let bookings = [pendingCash, onlinePaid, refunded];
  apiFetch.mockImplementation((path, options) => {
    if (path === '/ambulance/bookings/cash-1/cash-payment' && options?.method === 'POST') {
      bookings = [{
        ...pendingCash,
        paymentStatus: 'PAID',
        paidAmount: 200000,
        payments: [{
          id: 'cash-payment',
          amount: 200000,
          method: 'CASH',
          status: 'RECEIVED',
          receivedBy: 'cashier@hospital.test',
          receivedAt: '2026-10-06T13:00:00Z',
        }],
      }, onlinePaid, refunded];
      return response(bookings[0]);
    }
    if (path === '/ambulance/bookings') return response(bookings);
    if (path === '/ambulance/branches') return response([{ id: 'branch-a', name: 'Branch A' }]);
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });

  render(<AmbulanceBillingPage />);
  expect(await screen.findByText('₹60,000.00')).toBeInTheDocument();
  expect(screen.getAllByText('₹10,000.00').length).toBeGreaterThan(0);
  expect(screen.getAllByText('₹50,000.00').length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole('button', { name: 'Confirm cash received' }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/ambulance/bookings/cash-1/cash-payment', {
    method: 'POST',
  }));
  expect(await screen.findByRole('status')).toHaveTextContent('Cash payment ₹2,00,000.00 for AMB-CASH-1 confirmed');
  expect(await screen.findByText('₹2,60,000.00')).toBeInTheDocument();
  expect(screen.getByText('₹2,50,000.00')).toBeInTheDocument();
  expect(screen.getByText(/cashier@hospital\.test/)).toBeInTheDocument();
  expect(screen.getByText('No cash payments are awaiting confirmation.')).toBeInTheDocument();
});
