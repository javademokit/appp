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
      wardData: [{ unit: 'Ward A', patients: 2 }],
    };
    return { ok: true, json: async () => data };
  });

  const { container } = render(<HospitalOperationsBoard />);

  expect(await screen.findByText('Current admissions')).toBeInTheDocument();
  expect(screen.getByText('Operations dashboard')).toBeInTheDocument();
  expect(container.querySelector('.ops-kpi-grid')).toHaveTextContent('Results awaiting review');
  expect([...container.querySelectorAll('.ops-kpi strong')].map((metric) => metric.textContent)).toEqual(['2', '2', '2', '2']);
  expect(screen.queryByText('Demo data')).not.toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith('/dashboard/summary');
});
