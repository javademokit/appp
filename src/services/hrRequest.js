import { apiFetch } from '../API/api';

const employeeBadRequestMessage = 'Could not save this employee. Check that first name, last name, mobile, employee type, and joining date are filled in. Reporting manager and doctor consultation fee are optional. If you selected a department, designation, shift, or doctor profile, make sure it is valid.';

export async function request(path, options) {
  const response = await apiFetch(path, options);
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    const isEmployeeRequest = path === '/employees' || path.startsWith('/employees/');
    let requestBody = {};
    let body = {};
    try {
      requestBody = JSON.parse(options?.body || '{}');
    } catch {
      requestBody = {};
    }
    try {
      body = await response.json();
      const validationErrors = Array.isArray(body.errors)
        ? body.errors.map((entry) => {
          if (typeof entry === 'string') return entry;
          if (!entry || typeof entry !== 'object') return '';
          const detail = entry.defaultMessage || entry.message;
          return entry.field && detail ? `${entry.field}: ${detail}` : detail || '';
        }).filter(Boolean).join('; ')
        : '';
      const serverMessage = body.detail || body.message || validationErrors || body.error;
      const isNurseEmployeeRequest = path === '/employees'
        && String(requestBody.employeeType || '').toUpperCase() === 'NURSE';
      const genericConflictMessage = ['conflict', 'request failed (409)'];
      if (response.status === 409 && isNurseEmployeeRequest
        && (!serverMessage || genericConflictMessage.includes(String(serverMessage).trim().toLowerCase()))) {
        message = 'Could not create this nurse because a record conflicts with an existing employee. Check whether the email address or employee ID is already in use. If this is the same nurse, edit the existing employee instead.';
      } else if (!serverMessage && response.status === 400 && isEmployeeRequest) {
        message = employeeBadRequestMessage;
      } else {
        message = serverMessage || body.title || message;
      }
    } catch {
      if (response.status === 400 && isEmployeeRequest) {
        message = employeeBadRequestMessage;
      }
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
