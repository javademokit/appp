import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import PayrollPage from './PayrollPage';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

describe('PayrollPage', () => {
  beforeEach(() => {
    apiFetch.mockImplementation(async (path) => {
      const responseByPath = {
        '/users/me': { username: 'nurse-one', roles: ['NURSE'] },
        '/payroll/nurse-attendance/mine': [],
        '/payroll/me/payslips': [],
      };
      return { ok: true, json: async () => responseByPath[path] || [] };
    });
  });

  afterEach(() => jest.clearAllMocks());

  it('shows only self-service payslips to a nurse', async () => {
    render(<PayrollPage />);

    expect(await screen.findByRole('heading', { name: 'My payroll' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'My payslips and earnings' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Create draft cycle' })).not.toBeInTheDocument();
    await waitFor(() => expect(apiFetch.mock.calls.some(([path]) => path === '/payroll/me/payslips')).toBe(true));
    expect(apiFetch.mock.calls.some(([path]) => path === '/payroll/nurse-attendance/mine')).toBe(true);
    expect(apiFetch.mock.calls.some(([path]) => path === '/payroll/nurse-overtime')).toBe(false);
    expect(apiFetch.mock.calls.some(([path]) => path === '/payroll/cycles')).toBe(false);
  });

  it('loads a doctor own earnings and exposes the dispute form without manager APIs', async () => {
    apiFetch.mockImplementation(async (path) => {
      const responseByPath = {
        '/users/me': { username: 'doctor-one', roles: ['DOCTOR'] },
        '/payroll/me/payslips': [],
        '/payroll/doctor-earnings/mine': [{
          id: 'earning-1', serviceDate: '2026-05-02', patientRef: 'Patient A', service: 'Consultation',
          billedAmount: 500, doctorShare: 250, status: 'INCLUDED',
        }],
      };
      return { ok: true, json: async () => responseByPath[path] || [] };
    });
    render(<PayrollPage />);

    expect(await screen.findByRole('heading', { name: 'My earnings statement' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dispute' })).toBeInTheDocument();
    expect(apiFetch.mock.calls.some(([path]) => path === '/payroll/doctor-earnings/mine')).toBe(true);
    expect(apiFetch.mock.calls.some(([path]) => path === '/payroll/doctor-earnings')).toBe(false);
  });

  it('explains that salary setup is required before a draft cycle can be calculated', async () => {
    const responseByPath = {
      '/users/me': { username: 'admin', roles: ['HOSPITAL_ADMIN'] },
      '/payroll/components': [],
      '/payroll/structures': [],
      '/payroll/cycles': [{
        id: 'cycle-1', employeeType: 'DOCTOR', month: 10, year: 2026, fromDate: '2026-10-01',
        toDate: '2026-10-31', status: 'DRAFT', entries: [],
      }],
      '/payroll/nurse-overtime': [],
      '/payroll/nurse-attendance': [],
      '/payroll/employees?type=DOCTOR': [],
      '/payroll/employees?type=NURSE': [],
      '/payroll/salaries?type=DOCTOR': [],
      '/payroll/salaries?type=NURSE': [],
      '/nursing/wards': [],
      '/payroll/adjustments': [],
      '/payroll/loans': [],
      '/payroll/doctor-pay-profiles': [],
      '/payroll/doctor-rates': [],
      '/payroll/doctor-earnings': [],
      '/payroll/doctor-disputes': [],
      '/payroll/nurse-ward-allowances': [],
    };
    apiFetch.mockImplementation(async (path) => ({
      ok: true,
      json: async () => responseByPath[path] || [],
    }));
    render(<PayrollPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Payroll runs' }));

    expect(await screen.findByText(/Create a doctor salary component and structure before assigning salaries/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Calculate' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Create salary structure' }));
    expect(screen.getByRole('heading', { name: 'Configurable salary components' })).toBeInTheDocument();
    expect(apiFetch.mock.calls.some(([path, options]) =>
      path === '/payroll/cycles/cycle-1/calculate' && options?.method === 'POST')).toBe(false);
  });
});
