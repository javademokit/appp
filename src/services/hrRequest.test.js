import { apiFetch } from '../API/api';
import { request } from './hrRequest';

jest.mock('../API/api', () => ({ apiFetch: jest.fn() }));

describe('employee request errors', () => {
  beforeEach(() => jest.clearAllMocks());

  test('explains how to fix a generic employee bad request', async () => {
    apiFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ title: 'Bad Request' }),
    });

    await expect(request('/employees', { method: 'POST', body: '{}' })).rejects.toThrow(
      'Check that first name, last name, mobile, employee type, and joining date are filled in.',
    );
    await expect(request('/employees', { method: 'POST', body: '{}' })).rejects.toThrow(
      'Reporting manager and doctor consultation fee are optional.',
    );
  });

  test('shows the backend validation message when one is provided', async () => {
    apiFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ errors: [{ field: 'mobile', defaultMessage: 'Mobile number is required' }] }),
    });

    await expect(request('/employees', { method: 'POST', body: '{}' })).rejects.toThrow(
      'mobile: Mobile number is required',
    );
  });

  test('explains a nurse conflict when the API only returns a generic conflict title', async () => {
    apiFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: 'Conflict', title: 'Conflict' }),
    });

    await expect(request('/employees', {
      method: 'POST',
      body: JSON.stringify({ employeeType: 'NURSE' }),
    })).rejects.toThrow('Check whether the email address or employee ID is already in use.');
  });

  test('preserves the actual backend reason for a nurse conflict', async () => {
    apiFetch.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ status: 409, message: 'An employee already uses this email' }),
    });

    await expect(request('/employees', {
      method: 'POST',
      body: JSON.stringify({ employeeType: 'NURSE' }),
    })).rejects.toThrow('An employee already uses this email');
  });
});
