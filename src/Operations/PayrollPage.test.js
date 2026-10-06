import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    expect(screen.getByLabelText('PAN card')).not.toBeRequired();
    expect(screen.getByLabelText('Aadhaar card')).not.toBeRequired();
    expect(screen.getByLabelText('Experience letter')).not.toBeRequired();
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

  it('saves optional joining documents after creating an employee', async () => {
    apiFetch.mockImplementation(async (path, options = {}) => {
      if (path === '/users/me') return jsonResponse({ username: 'hr-user', roles: ['HR'] });
      if (path === '/employees' && options.method === 'POST') return jsonResponse({ id: 'employee-1' });
      if (path.startsWith('/employees/employee-1/documents/')) return jsonResponse({ fileName: 'pan-card.pdf' });
      const responses = {
        '/employees': [],
        '/departments': [],
        '/designations': [],
        '/shifts': [],
        '/employee-types': [{ id: 'type-other', code: 'OTHER', name: 'Other', status: 'ACTIVE' }],
        '/doctors': [],
      };
      const body = Object.entries(responses).find(([key]) => path.startsWith(key))?.[1] || [];
      return jsonResponse(body);
    });

    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Employees' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add employee', exact: true }));
    fireEvent.change(await screen.findByLabelText(/Employee type/), { target: { value: 'OTHER' } });
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Riya' } });
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Shah' } });
    fireEvent.change(screen.getByLabelText(/Mobile/), { target: { value: '5551234567' } });
    fireEvent.change(screen.getByLabelText(/Joining date/), { target: { value: '2026-10-01' } });
    const panCardInput = screen.getByLabelText('PAN card');
    userEvent.upload(panCardInput, new File(['PAN'], 'pan-card.pdf', { type: 'application/pdf' }));
    expect(panCardInput.files).toHaveLength(1);
    expect(panCardInput.files[0]).toMatchObject({ name: 'pan-card.pdf', size: 3 });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
      '/employees/employee-1/documents/PAN_CARD',
      expect.objectContaining({ method: 'POST', body: expect.any(FormData) }),
    ));
  });

  it('creates a doctor employee with linked schedule details for the Doctor Schedule roster', async () => {
    apiFetch.mockImplementation(async (path, options = {}) => {
      const responses = {
        '/users/me': { username: 'hr-user', roles: ['HR'] },
        '/employees': [],
        '/departments': [],
        '/designations': [],
        '/shifts': [],
        '/employee-types': [{ id: 'type-doctor', code: 'DOCTOR', name: 'Doctor', status: 'ACTIVE' }],
        '/doctors': [],
      };
      if (path === '/employees' && options.method === 'POST') return jsonResponse({ id: 'employee-1' });
      const body = Object.entries(responses).find(([key]) => path.startsWith(key))?.[1] || [];
      return jsonResponse(body);
    });

    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Employees' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Add employee', exact: true }));
    fireEvent.change(await screen.findByLabelText(/Employee type/), { target: { value: 'DOCTOR' } });
    fireEvent.change(screen.getByLabelText(/First name/), { target: { value: 'Mira' } });
    fireEvent.change(screen.getByLabelText(/Last name/), { target: { value: 'Patel' } });
    fireEvent.change(screen.getByLabelText(/Mobile/), { target: { value: '5551234567' } });
    fireEvent.change(screen.getByLabelText(/Joining date/), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('Specialization'), { target: { value: 'Cardiology' } });
    fireEvent.change(screen.getByLabelText('Consultation fee'), { target: { value: '650' } });
    fireEvent.change(screen.getByLabelText(/^Available appointment times/), { target: { value: '09:00, 09:30' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/employees', expect.objectContaining({
      method: 'POST',
      body: expect.any(String),
    })));
    const [, request] = apiFetch.mock.calls.find(([path, options]) => (
      path === '/employees' && options?.method === 'POST'
    ));
    expect(JSON.parse(request.body)).toMatchObject({
      employeeType: 'DOCTOR',
      doctorProfileId: '',
      doctorConsultationFee: 650,
      doctorAvailableTimes: ['09:00', '09:30'],
      professionalInfo: { specialization: 'Cardiology' },
    });
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

  it('lets employees submit an overtime allowance request for review', async () => {
    apiFetch.mockImplementation(async (path, options = {}) => {
      if (path === '/users/me') return jsonResponse({ username: 'nurse-one', roles: ['NURSE'] });
      if (path === '/overtime-allowances' && options.method === 'POST') {
        return jsonResponse({ id: 'ot-1', status: 'PENDING' });
      }
      if (path === '/overtime-allowances/mine') return jsonResponse([]);
      return jsonResponse({});
    });

    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Overtime allowances' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Request allowance' }));
    const overtimeDate = new Date().toISOString().slice(0, 10);
    fireEvent.change(screen.getByLabelText(/Overtime date/), { target: { value: overtimeDate } });
    fireEvent.change(screen.getByLabelText(/Hours/), { target: { value: '2.5' } });
    fireEvent.change(screen.getByLabelText(/Reason/), { target: { value: 'Emergency ward coverage' } });
    fireEvent.click(screen.getByRole('button', { name: 'Submit request' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/overtime-allowances', expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({
        overtimeDate,
        hours: 2.5,
        reason: 'Emergency ward coverage',
      }),
    })));
  });

  it('lets HR set the approved allowance amount for a pending request', async () => {
    const pending = {
      id: 'ot-1', employeeName: 'Anita Singh', employeeCode: 'EMP-10026', month: '2026-10',
      overtimeDate: '2026-10-04', hours: 2.5, reason: 'Emergency ward coverage', status: 'PENDING',
    };
    apiFetch.mockImplementation(async (path, options = {}) => {
      if (path === '/users/me') return jsonResponse({ username: 'hr-user', roles: ['HR'] });
      if (path.startsWith('/overtime-allowances?month=')) return jsonResponse([pending]);
      if (path === '/overtime-allowances/ot-1/approve' && options.method === 'PUT') {
        return jsonResponse({ ...pending, status: 'APPROVED', approvedAmount: 1250.75 });
      }
      return jsonResponse({});
    });

    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Overtime allowances' }));
    expect(await screen.findByText('Anita Singh')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Approved amount for Anita Singh'), { target: { value: '1250.75' } });
    fireEvent.click(screen.getByRole('button', { name: 'Approve Anita Singh' }));

    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(
      '/overtime-allowances/ot-1/approve',
      expect.objectContaining({ method: 'PUT', body: JSON.stringify({ approvedAmount: '1250.75' }) }),
    ));
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

  it('shows the server explanation when payroll calculation needs salary setup', async () => {
    apiFetch.mockImplementation(async (path, options = {}) => {
      if (path === '/users/me') return jsonResponse({ username: 'hr-user', roles: ['HR'] });
      if (path === '/payroll?month=2026-10') {
        return jsonResponse([{
          id: 'run-1', month: '2026-10', status: 'DRAFT', employeeCount: 0,
          totalGross: 0, totalDeduction: 0, totalNet: 0,
        }]);
      }
      if (path === '/payroll/run-1/calculate' && options.method === 'POST') {
        return {
          ok: false,
          status: 422,
          headers: { get: () => 'application/problem+json' },
          json: async () => ({
            status: 422,
            message: 'Payroll cannot be calculated: DT-100 (Dr Example) is missing an active salary structure covering the full payroll month (2026-10). Open Salary → Salary Structures and assign each listed employee an active structure whose effective dates cover the full payroll month, then calculate again.',
          }),
        };
      }
      return jsonResponse({});
    });

    render(<PayrollPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Payroll', exact: true }));
    fireEvent.click(await screen.findByRole('button', { name: 'Calculate' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Payroll cannot be calculated: DT-100 (Dr Example) is missing an active salary structure covering the full payroll month (2026-10). Open Salary → Salary Structures and assign each listed employee an active structure whose effective dates cover the full payroll month, then calculate again.',
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent('Unprocessable Entity');
  });
});
