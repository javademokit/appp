import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import AmbulancePage from './AmbulancePage';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));
jest.mock('../PaymentPage/paymentGatewayCheckout', () => ({ startAmbulanceCheckout: jest.fn() }));
jest.mock('react-leaflet', () => {
  const React = require('react');
  const Container = ({ children }) => <div>{children}</div>;
  return {
    CircleMarker: Container,
    MapContainer: Container,
    Popup: Container,
    TileLayer: () => null,
    useMap: () => ({ getZoom: () => 5, setView: jest.fn() }),
  };
});

afterEach(() => jest.clearAllMocks());

function response(data, ok = true) {
  return Promise.resolve({ ok, json: async () => data });
}

test('books an existing patient by cash with fare calculated from kilometers', async () => {
  apiFetch.mockImplementation((path, options) => {
    if (path === '/ambulance/configuration') return response({ ratePerKilometer: 100, onlinePaymentAvailable: false });
    if (path === '/ambulance/patients') return response([{
      patientId: 'PT-101', patientName: 'Aadi Patient', mobile: '5551001010', address: '12 Main Road',
    }]);
    if (path === '/ambulance/vehicles' && !options) return response([]);
    if (path === '/ambulance/bookings' && !options) return response([]);
    if (path === '/ambulance/branches' && !options) return response([{ id: 'branch-a', name: 'Branch A' }]);
    if (path === '/ambulance/bookings' && options?.method === 'POST') {
      return response({ id: 'booking-1', bookingNumber: 'AMB-101', paymentMethod: 'CASH', amount: 200 });
    }
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });

  render(<AmbulancePage />);
  await screen.findByRole('option', { name: 'Branch A' });
  fireEvent.change(screen.getByLabelText('Dashboard branch'), { target: { value: 'branch-a' } });
  fireEvent.click(await screen.findByRole('button', { name: /book ambulance/i }));
  fireEvent.change(screen.getByLabelText('Existing patient'), { target: { value: 'PT-101' } });
  fireEvent.change(screen.getByLabelText('Ambulance branch'), { target: { value: 'branch-a' } });
  expect(screen.getByLabelText('Pickup address')).toHaveValue('12 Main Road');
  fireEvent.change(screen.getByLabelText('Drop-off address'), { target: { value: 'City Hospital' } });
  fireEvent.change(screen.getByLabelText('Distance (km)'), { target: { value: '2' } });
  expect(screen.getByLabelText('Estimated ambulance fare')).toHaveValue('₹200.00');
  fireEvent.click(screen.getByRole('button', { name: /book & collect cash/i }));

  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/ambulance/bookings', {
    method: 'POST',
    body: JSON.stringify({
      patientId: 'PT-101',
      branchId: 'branch-a',
      pickupAddress: '12 Main Road',
      dropAddress: 'City Hospital',
      distanceKm: 2,
      paymentMethod: 'CASH',
    }),
  }));
  expect(await screen.findByRole('status')).toHaveTextContent('Cash payment of ₹200.00 is awaiting billing confirmation before dispatch.');
});

test('shows the assigned vehicle registration prominently for completed bookings', async () => {
  apiFetch.mockImplementation((path) => {
    if (path === '/ambulance/configuration') return response({ ratePerKilometer: 100, onlinePaymentAvailable: false });
    if (path === '/ambulance/patients') return response([]);
    if (path === '/ambulance/branches') return response([{ id: 'branch-a', name: 'Branch A' }]);
    if (path === '/ambulance/vehicles') return response([{
      id: 'vehicle-1', registrationNumber: 'KA53ET49990', branchId: 'branch-a',
      branchName: 'Branch A', driverName: 'Shyamlal Yadav', status: 'AVAILABLE',
    }]);
    if (path === '/ambulance/bookings') return response([{
      id: 'booking-1', bookingNumber: 'AMB-9F6456FC', status: 'COMPLETED',
      patientName: 'Patient', patientId: 'PT-101', branchId: 'branch-a',
      vehicleId: 'vehicle-1', paymentStatus: 'PAID', amount: 60000, paidAmount: 60000,
      paymentMethod: 'CASH', pickupAddress: 'Pickup', dropAddress: 'Drop',
      distanceKm: 600, ratePerKm: 100,
    }]);
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });

  render(<AmbulancePage />);

  const vehicleBadge = await screen.findByLabelText('Vehicle number KA53ET49990');
  expect(vehicleBadge).toHaveTextContent('Vehicle No: KA53ET49990');
});
