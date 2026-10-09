import { render, screen } from '@testing-library/react';
import { apiFetch } from '../API/api';
import HospitalOperationsBoard from './HospitalOperationsBoard';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

afterEach(() => jest.clearAllMocks());

test('shows privacy-minimized dashboard metrics returned by the live summary endpoint', async () => {
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  apiFetch.mockImplementation(async () => {
    const data = {
      activeAdmissions: 2,
      totalBeds: 12,
      availableBeds: 7,
      occupiedBeds: 5,
      totalNurses: 9,
      openEmergencies: 2,
      resultsAwaitingReview: 2,
      testsOrdered: 1,
      testsInProgress: 0,
      dailyActivity: Array.from({ length: 30 }, (_, index) => ({
        key: index === 29 ? todayKey : `2026-01-${String(index + 1).padStart(2, '0')}`,
        visits: index === 29 ? 2 : 0,
        emergency: index === 29 ? 2 : 0,
        diagnostics: index === 29 ? 2 : 0,
        admissions: index === 29 ? 2 : 0,
      })),
      hourlyActivity: Array.from({ length: 24 }, (_, hour) => ({
        key: todayKey, hour, label: `${String(hour).padStart(2, '0')}:00`,
        visits: 0, emergency: 0, diagnostics: 0, admissions: 0,
      })),
      wardData: [{
        unit: 'Ward A', patients: 2, totalBeds: 5, availableBeds: 3, occupiedBeds: 2,
      }],
    };
    return { ok: true, json: async () => data };
  });

  const { container } = render(<HospitalOperationsBoard />);

  expect(await screen.findByText('Current admissions')).toBeInTheDocument();
  expect(screen.getByText('Operations dashboard')).toBeInTheDocument();
  expect(container.querySelector('.ops-kpi-grid')).toHaveTextContent('Results awaiting review');
  expect(container.querySelector('.ops-kpi-grid')).toHaveTextContent('Total beds');
  expect(container.querySelector('.ops-kpi-grid')).toHaveTextContent('Active nurses');
  expect([...container.querySelectorAll('.ops-kpi strong')].map((metric) => metric.textContent))
    .toEqual(['2', '2', '2', '2', '12', '7', '5', '9']);
  expect(screen.getByRole('heading', { name: 'Beds by ward' })).toBeInTheDocument();
  expect(screen.getByRole('group', { name: /stacked horizontal bar chart.*1 ward/i })).toBeInTheDocument();
  expect(screen.getByText('Unavailable')).toBeInTheDocument();
  expect(screen.queryByText('Demo data')).not.toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith('/dashboard/summary');
});

test('keeps charts for 100 wards readable inside a scrollable graph area', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({
      activeAdmissions: 0,
      totalBeds: 1000,
      availableBeds: 600,
      occupiedBeds: 300,
      totalNurses: 20,
      openEmergencies: 0,
      resultsAwaitingReview: 0,
      testsOrdered: 0,
      testsInProgress: 0,
      dailyActivity: [],
      hourlyActivity: [],
      wardData: Array.from({ length: 100 }, (_, index) => ({
        unit: `Ward ${String(index + 1).padStart(3, '0')}`,
        patients: 3,
        totalBeds: 10,
        availableBeds: 6,
        occupiedBeds: 3,
      })),
    }),
  });

  const { container } = render(<HospitalOperationsBoard />);

  expect(await screen.findByText('100 wards')).toBeInTheDocument();
  expect(screen.getByRole('group', { name: /chart showing available, occupied, and unavailable beds across 100 wards/ }))
    .toBeInTheDocument();
  expect(container.querySelector('.ward-chart-canvas')).toHaveStyle({ height: '4200px' });
});
