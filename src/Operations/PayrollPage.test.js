import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { apiFetch } from '../API/api';
import PayrollPage from '../pages/payroll/PayrollRun';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

const jsonResponse = (body) => ({
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  json: async () => body,
});

describe('PayrollPage', () => {
  afterEach(() => jest.clearAllMocks());

  it('shows the generic HR dashboard and employee onboarding UI', async () => {
    apiFetch.mockImplementation(async (path, options = {}) => {
      const responses = {
        '/users/me': { username: 'hr-user', roles: ['HR'] },
        '/hr/dashboard': {
          totalEmployees: 245, activeEmployees: 230, onLeave: 10, noticePeriod: 3,
          payrollSummary: { month: '2026-10', status: 'PENDING_APPROVAL', totalGross: 18540000, totalDeduction: 2850000, totalNet: 15690000 },
          attendanceToday: { present: 218, absent: 12, onLeave: 10 },
          pendingActions: { onboarding: 8, leaveApprovals: 5, payrollApprovals: 1, documents: 3 },
        },
        '/employees': [{
          id: 'employee-1', employeeCode: 'EMP-10025', firstName: 'Rahul', lastName: 'Sharma',
          employeeType: 'DOCTOR', departmentName: 'Cardiology', designationName: 'Senior Doctor',
          joiningDate: '2026-10-01', status: 'ACTIVE',
        }],
        '/departments': [],
        '/designations': [],
        '/shifts': [],
        '/employee-types': [
          { id: 'type-doctor', code: 'DOCTOR', name: 'Doctor', status: 'ACTIVE' },
          { id: 'type-other', code: 'OTHER', name: 'Other', status: 'ACTIVE' },
        ],
        '/doctors': [{
          id: 'doctor-profile-1', doctorName: 'Dr. Example', doctorSpecialistName: 'Cardiology',
          doctorDestination: 'Cardiology Department',
        }],
      };
      if (path === '/employees' && options.method === 'POST') return jsonResponse({ id: 'employee-1' });
      const body = Object.entries(responses).find(([key]) => path.startsWith(key))?.[1] || [];
      return jsonResponse(body);
    });

    render(<PayrollPage />);

    expect(await screen.findByText('245')).toBeInTheDocument();
    expect(screen.getByText('Total employees')).toBeInTheDocument();
    expect(screen.getByText('Net payroll')).toBeInTheDocument();
    expect(screen.getByText('Attendance today')).toBeInTheDocument();
    expect(screen.getByText('Pending actions')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Doctors' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Employees' }));
    expect(await screen.findByText('Rahul Sharma')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Add employee', exact: true }));
    expect(screen.getByRole('dialog', { name: 'Add employee' })).toBeInTheDocument();
    expect(screen.getByLabelText(/First name/)).toBeRequired();
    expect(screen.getByLabelText(/Employee type/)).toBeInTheDocument();
  });

  it('shows doctor profiles for doctor employees and keeps Other selectable', async () => {
    apiFetch.mockImplementation(async (path, options = {}) => {
      const responses = {
        '/users/me': { username: 'hr-user', roles: ['HR'] },
        '/employees': [],
        '/departments': [{ id: 'department-cardio', name: 'Cardiology Department', code: 'CARDIOLOGY' }],
        '/designations': [],
        '/shifts': [],
        '/employee-types': [
          { id: 'type-doctor', code: 'DOCTOR', name: 'Doctor', status: 'ACTIVE' },
          { id: 'type-other', code: 'OTHER', name: 'Other', status: 'ACTIVE' },
        ],
        '/doctors': [{
          id: 'doctor-profile-1', doctorName: 'Dr. Example', doctorSpecialistName: 'Cardiology',
          doctorDestination: 'Cardiology Department',
        }],
      };
      if (path === '/employees' && options.method === 'POST') return jsonResponse({ id: 'employee-1' });
      const body = Object.entries(responses).find(([key]) => path.startsWith(key))?.[1] || [];
      return jsonResponse(body);
    });

    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Employees' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add employee', exact: true }));
    const employeeType = screen.getByLabelText(/Employee type/);
    expect(screen.getByRole('option', { name: 'Other' })).toBeInTheDocument();
    fireEvent.change(employeeType, { target: { value: 'OTHER' } });
    expect(employeeType).toHaveValue('OTHER');
    fireEvent.change(employeeType, { target: { value: 'DOCTOR' } });

    const doctorProfile = screen.getByLabelText('Doctor profile');
    expect(doctorProfile).toHaveDisplayValue('No doctor profile linked');
    expect(screen.getByRole('option', { name: 'Dr. Example · Cardiology · Cardiology Department' }))
      .toBeInTheDocument();
    fireEvent.change(doctorProfile, { target: { value: 'doctor-profile-1' } });
    expect(screen.getByLabelText(/^Department/)).toHaveValue('department-cardio');

    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Riya' } });
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Shah' } });
    fireEvent.change(screen.getByLabelText(/Mobile/), { target: { value: '5551000' } });
    fireEvent.change(screen.getByLabelText(/Joining date/), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/employees', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"doctorProfileId":"doctor-profile-1"'),
    })));
    expect(apiFetch.mock.calls.some(([path, options]) => (
      path === '/employees'
      && options?.method === 'POST'
      && JSON.parse(options.body).departmentId === 'department-cardio'
    ))).toBe(true);
  });

  it('shows a profile department in the department selector when no organization match exists', async () => {
    apiFetch.mockImplementation(async (path, options = {}) => {
      const responses = {
        '/users/me': { username: 'hr-user', roles: ['HR'] },
        '/employees': [],
        '/departments': [],
        '/designations': [],
        '/shifts': [],
        '/employee-types': [{ id: 'type-doctor', code: 'DOCTOR', name: 'Doctor', status: 'ACTIVE' }],
        '/doctors': [{
          id: 'doctor-profile-1', doctorName: 'Dr. Example', doctorSpecialistName: 'Cardiology',
          doctorDestination: 'Cardiology Unit',
        }],
      };
      if (path === '/employees' && options.method === 'POST') return jsonResponse({ id: 'employee-1' });
      const body = Object.entries(responses).find(([key]) => path.startsWith(key))?.[1] || [];
      return jsonResponse(body);
    });

    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Employees' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add employee', exact: true }));
    fireEvent.change(screen.getByLabelText(/Employee type/), { target: { value: 'DOCTOR' } });
    fireEvent.change(screen.getByLabelText('Doctor profile'), { target: { value: 'doctor-profile-1' } });

    expect(screen.getByLabelText(/^Department/)).toHaveDisplayValue('Cardiology Unit');
    expect(screen.getByText(/Department from doctor profile: Cardiology Unit/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Riya' } });
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Shah' } });
    fireEvent.change(screen.getByLabelText(/Mobile/), { target: { value: '5551000' } });
    fireEvent.change(screen.getByLabelText(/Joining date/), { target: { value: '2026-10-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/employees', expect.objectContaining({
      method: 'POST',
      body: expect.stringContaining('"departmentName":"Cardiology Unit"'),
    })));
    const [, options] = apiFetch.mock.calls.find(([path, request]) => (
      path === '/employees' && request?.method === 'POST'
    ));
    expect(JSON.parse(options.body)).toMatchObject({
      departmentId: '',
      departmentName: 'Cardiology Unit',
      doctorProfileId: 'doctor-profile-1',
    });
  });

  it('limits an individual nurse to their own payslips', async () => {
    apiFetch.mockImplementation(async (path) => {
      const responses = {
        '/users/me': { username: 'nurse-one', roles: ['NURSE'] },
        '/payroll/me/payslips': [{
          id: 'slip-1', payslipNumber: 'PS-2026-10-1', month: '2026-10', netSalary: 57800,
          employeeName: 'Anita Singh', employeeCode: 'EMP-10026', designation: 'Nurse', department: 'Ward',
          grossSalary: 65000, totalDeduction: 7200,
          earnings: [{ name: 'Basic Salary', amount: 50000 }, { name: 'HRA', amount: 15000 }],
          deductions: [{ name: 'PF', amount: 5000 }, { name: 'TDS', amount: 2200 }],
        }],
      };
      const body = Object.entries(responses).find(([key]) => path.startsWith(key))?.[1] || [];
      return jsonResponse(body);
    });

    render(<PayrollPage />);

    expect(await screen.findByRole('heading', { name: 'Payslips' })).toBeInTheDocument();
    expect(await screen.findByText('PS-2026-10-1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'View' }));
    expect(screen.getByText('Basic Salary')).toBeInTheDocument();
    expect(screen.getByText('PF')).toBeInTheDocument();
    expect(screen.getByText('Gross salary')).toBeInTheDocument();
    expect(screen.getAllByText('Net salary')[0]).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Employees' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Payroll runs' })).not.toBeInTheDocument();
    await waitFor(() => expect(apiFetch.mock.calls.some(([path]) => path === '/payroll/me/payslips')).toBe(true));
    expect(apiFetch.mock.calls.some(([path]) => path.startsWith('/employees'))).toBe(false);
  });

  it('previews employee pay and keeps payroll approval connected to its action endpoint', async () => {
    apiFetch.mockImplementation(async (path) => {
      const responses = {
        '/users/me': { username: 'hr-user', roles: ['HR'] },
        '/hr/dashboard': {},
        '/payroll?month=2026-10': [{
          id: 'run-1', month: '2026-10', status: 'CALCULATED', employeeCount: 1,
          totalGross: 125000, totalDeduction: 17800, totalNet: 107200,
          items: [{
            employeeName: 'Rahul Sharma', employeeType: 'DOCTOR',
            grossSalary: 125000, totalDeduction: 17800, netSalary: 107200,
          }],
        }],
      };
      const body = Object.entries(responses).find(([key]) => path.startsWith(key))?.[1] || {};
      return jsonResponse(body);
    });

    render(<PayrollPage />);
    expect(await screen.findByText('Total employees')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Payroll', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Preview' }));
    expect(await screen.findByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getAllByText('Gross')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Net')[0]).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    await waitFor(() => expect(apiFetch.mock.calls.some(([path, options]) =>
      path === '/payroll/run-1/approve' && options?.method === 'POST')).toBe(true));
  });
});
