import { apiFetch } from '../API/api';

export async function request(path, options) {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await response.json();
      message = body.message || body.error || message;
    } catch {
      // Keep the HTTP status message when the server did not return JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : null;
}

export const jsonOptions = (method, body) => ({
  method,
  body: JSON.stringify(body),
});

export const apiResponse = (path) => apiFetch(path);
