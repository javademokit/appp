import { fireEvent, render, screen } from '@testing-library/react';
import { apiFetch } from '../API/api';
import SignUpPage from './SignUpPage';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

afterEach(() => jest.clearAllMocks());

test('requires a 12-character password before creating an account', async () => {
  render(<SignUpPage />);
  fireEvent.change(screen.getByPlaceholderText('UserId'), { target: { value: 'new-user' } });
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'new@example.test' } });
  fireEvent.change(screen.getByPlaceholderText('MobileNo'), { target: { value: '5551234567' } });
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'short' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

  expect(await screen.findByText('Password must be at least 12 characters')).toBeInTheDocument();
  expect(apiFetch).not.toHaveBeenCalled();
});

test('creates a patient account and reports its initial access level', async () => {
  apiFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ success: true }),
  });
  render(<SignUpPage />);
  fireEvent.change(screen.getByPlaceholderText('UserId'), { target: { value: 'new-user' } });
  fireEvent.change(screen.getByPlaceholderText('Email'), { target: { value: 'new@example.test' } });
  fireEvent.change(screen.getByPlaceholderText('MobileNo'), { target: { value: '5551234567' } });
  fireEvent.change(screen.getByPlaceholderText('Password'), { target: { value: 'StrongTestPass2026' } });
  fireEvent.click(screen.getByRole('button', { name: 'Sign Up' }));

  expect(await screen.findByText('Patient account created. You can now sign in.')).toBeInTheDocument();
  expect(apiFetch).toHaveBeenCalledWith('/users/signup', expect.objectContaining({
    method: 'POST',
    body: JSON.stringify({
      userId: 'new-user',
      emailId: 'new@example.test',
      mobileNo: '5551234567',
      password: 'StrongTestPass2026',
    }),
  }));
});
