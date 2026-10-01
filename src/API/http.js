export const API_BASE_URL = (process.env.REACT_APP_API_BASE_URL || 'http://localhost:7771/api').replace(/\/$/, '');

export const apiFetch = async (path, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const headers = { ...(options.headers || {}) };

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (options.body && !isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrfResponse = await fetch(`${API_BASE_URL}/users/csrf`, { credentials: 'include' });
    if (!csrfResponse.ok) throw new Error('Could not initialize request security');
    const { token } = await csrfResponse.json();
    headers['X-XSRF-TOKEN'] = token;
  }

  return fetch(`${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`, {
    ...options,
    method,
    headers,
    credentials: 'include',
  });
};
