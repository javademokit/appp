import { fireEvent, render, screen } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

jest.mock('./UserAccessPage', () => () => <div>User access content</div>);
jest.mock('./EmployeeOnboarding', () => () => <div>Employee onboarding content</div>);
jest.mock('../payrollDesk/PayrollDesk', () => ({ initialTab }) => (
  <div>Payroll desk {initialTab}</div>
));

test('shows the administration control center and switches between its sections', () => {
  render(<AdminDashboard />);

  expect(screen.getByRole('heading', { name: 'Administration workspace' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Operations Hospital overview/ })).not.toBeInTheDocument();
  expect(screen.getByText('Employee onboarding content')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Users & access Accounts and roles/ }));
  expect(screen.getByText('User access content')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Users & access Accounts and roles/ })).toHaveAttribute('aria-current', 'page');

  fireEvent.click(screen.getByRole('button', { name: /Employees Staff records and onboarding/ }));
  expect(screen.getByText('Employee onboarding content')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Employees Staff records and onboarding/ })).toHaveAttribute('aria-current', 'page');

  fireEvent.click(screen.getByRole('button', { name: /HR & payroll People and compensation/ }));
  expect(screen.getByText('Payroll desk run')).toBeInTheDocument();
  expect(screen.getByRole('navigation', { name: 'Administration pages' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Salary setup Components and structures/ }));
  expect(screen.getByText('Payroll desk str')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Salary setup Components and structures/ })).toHaveAttribute('aria-current', 'page');
});

test('opens salary setup from a PayrollPortal link', () => {
  window.history.pushState({}, '', '/AdminDashboard?section=salary&salaryView=structures');
  render(<AdminDashboard />);

  expect(screen.getByText('Payroll desk str')).toBeInTheDocument();

  window.history.pushState({}, '', '/');
});

test('opens the payroll desk from overtime, history, and approval links', () => {
  window.history.pushState({}, '', '/AdminDashboard?section=payroll&payrollView=overtime');
  const { unmount } = render(<AdminDashboard />);
  expect(screen.getByText('Payroll desk run')).toBeInTheDocument();
  unmount();

  window.history.pushState({}, '', '/AdminDashboard?section=payroll&payrollView=history');
  const historyView = render(<AdminDashboard />);
  expect(screen.getByText('Payroll desk run')).toBeInTheDocument();
  historyView.unmount();

  window.history.pushState({}, '', '/AdminDashboard?section=payroll&payrollView=approval');
  render(<AdminDashboard />);
  expect(screen.getByText('Payroll desk run')).toBeInTheDocument();

  window.history.pushState({}, '', '/');
});
