import { fireEvent, render, screen } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

jest.mock('../components/HospitalOperationsBoard', () => () => <div>Operations overview content</div>);
jest.mock('./UserAccessPage', () => () => <div>User access content</div>);
jest.mock('../pages/payroll/PayrollRun', () => ({ hideHeader, employeesOnly, payrollOnly, salaryOnly, initialSalaryView, initialPayrollView }) => (
  <div>
    {!hideHeader && <header>Payroll workspace header</header>}
    {employeesOnly ? <div>Employee workspace content</div>
      : payrollOnly ? <div>Payroll {initialPayrollView || 'payroll'} content</div>
        : salaryOnly ? <div>Salary setup {initialSalaryView || 'components'} content</div>
          : null}
  </div>
));

test('shows the administration control center and switches between its sections', () => {
  render(<AdminDashboard />);

  expect(screen.getByRole('heading', { name: 'Hospital control center' })).toBeInTheDocument();
  expect(screen.getByText('Operations overview content')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Users & access Accounts and roles/ }));
  expect(screen.getByText('User access content')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Users & access Accounts and roles/ })).toHaveAttribute('aria-current', 'page');

  fireEvent.click(screen.getByRole('button', { name: /Employees Staff records and onboarding/ }));
  expect(screen.getByText('Employee workspace content')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Employees Staff records and onboarding/ })).toHaveAttribute('aria-current', 'page');

  fireEvent.click(screen.getByRole('button', { name: /HR & payroll People and compensation/ }));
  expect(screen.getByText('Payroll content')).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'Hospital control center' })).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Administration pages' })).toBeInTheDocument();
  expect(screen.queryByText('Payroll workspace header')).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Salary setup Components and structures/ }));
  expect(screen.getByText('Salary setup components content')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Salary setup Components and structures/ })).toHaveAttribute('aria-current', 'page');
});

test('opens the requested salary view from a PayrollPortal link', () => {
  window.history.pushState({}, '', '/AdminDashboard?section=salary&salaryView=structures');
  render(<AdminDashboard />);

  expect(screen.getByText('Salary setup structures content')).toBeInTheDocument();

  window.history.pushState({}, '', '/');
});

test('opens overtime allowance review inside the AdminDashboard payroll workspace', () => {
  window.history.pushState({}, '', '/AdminDashboard?section=payroll&payrollView=overtime');
  render(<AdminDashboard />);

  expect(screen.getByText('Payroll overtime content')).toBeInTheDocument();

  window.history.pushState({}, '', '/');
});
