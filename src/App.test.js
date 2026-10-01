import { apiFetch, API_BASE_URL } from './API/http';

const originalFetch = global.fetch;

afterEach(() => {
  global.fetch = originalFetch;
});

test('sends mutations with the session cookie and CSRF token', async () => {
  global.fetch = jest.fn()
    .mockResolvedValueOnce({ ok: true, json: async () => ({ token: 'csrf-token' }) })
    .mockResolvedValueOnce({ ok: true, status: 201 });

  await apiFetch('/patients', {
    method: 'POST',
    body: JSON.stringify({ patientName: 'Test Patient' }),
  });

  expect(global.fetch).toHaveBeenNthCalledWith(1, `${API_BASE_URL}/users/csrf`, {
    credentials: 'include',
  });
  const [, requestOptions] = global.fetch.mock.calls[1];
  expect(requestOptions.credentials).toBe('include');
  expect(requestOptions.headers['X-XSRF-TOKEN']).toBe('csrf-token');
  expect(requestOptions.method).toBe('POST');
});
