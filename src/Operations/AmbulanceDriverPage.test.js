import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import AmbulanceDriverPage from './AmbulanceDriverPage';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

function response(data) {
  return Promise.resolve({ ok: true, json: async () => data });
}

beforeEach(() => {
  localStorage.clear();
  Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
});

afterEach(() => {
  jest.clearAllMocks();
  delete navigator.geolocation;
});

test('pairs a driver phone and shares its browser GPS position', async () => {
  let onPosition;
  const geolocation = {
    watchPosition: jest.fn((success) => { onPosition = success; return 7; }),
    clearWatch: jest.fn(),
  };
  Object.defineProperty(navigator, 'geolocation', { configurable: true, value: geolocation });
  apiFetch.mockImplementation((path) => {
    if (path === '/ambulance/tracking/pair') return response({
      vehicleId: 'vehicle-1',
      registrationNumber: 'AMB-101',
      driverName: 'Driver',
      locationToken: 'private-tracking-token',
    });
    if (path === '/ambulance/tracking/location') return response({ receivedAt: new Date().toISOString() });
    return Promise.reject(new Error(`Unexpected request: ${path}`));
  });

  const { unmount } = render(<AmbulanceDriverPage />);
  fireEvent.change(screen.getByLabelText('One-time pairing code'), { target: { value: 'ABCD1234' } });
  fireEvent.click(screen.getByRole('button', { name: 'Pair this phone' }));
  expect(await screen.findByRole('heading', { name: 'AMB-101' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Start sharing location' }));

  await act(async () => {
    onPosition({ coords: { latitude: 12.97, longitude: 77.59, accuracy: 6 } });
    await Promise.resolve();
  });
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/ambulance/tracking/location', {
    method: 'POST',
    headers: { Authorization: 'Bearer private-tracking-token' },
    body: JSON.stringify({ latitude: 12.97, longitude: 77.59, accuracyMeters: 6 }),
  }));
  expect(await screen.findByText(/Location shared at/)).toBeInTheDocument();
  unmount();
  expect(geolocation.clearWatch).toHaveBeenCalledWith(7);
});
