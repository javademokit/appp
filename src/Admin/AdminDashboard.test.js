import { fireEvent, render, screen } from '@testing-library/react';
import AdminDashboard from './AdminDashboard';

jest.mock('../components/HospitalOperationsBoard', () => () => <div>Operations overview content</div>);
jest.mock('./UserAccessPage', () => () => <div>User access content</div>);
jest.mock('../pages/payroll/PayrollRun', () => () => <div>Payroll content</div>);

test('shows the administration control center and switches between its sections', () => {
  render(<AdminDashboard />);

  expect(screen.getByRole('heading', { name: 'Hospital control center' })).toBeInTheDocument();
  expect(screen.getByText('Operations overview content')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Users & access Accounts and roles/ }));
  expect(screen.getByText('User access content')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Users & access Accounts and roles/ })).toHaveAttribute('aria-current', 'page');

  fireEvent.click(screen.getByRole('button', { name: /HR & payroll People and compensation/ }));
  expect(screen.getByText('Payroll content')).toBeInTheDocument();
});
