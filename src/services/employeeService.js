import { API_BASE_URL } from '../API/api';
import { request, jsonOptions } from './hrRequest';

export const getCurrentUser = () => request('/users/me');
export const getEmployees = () => request('/employees');
export const getEmployeeTypes = () => request('/employee-types');
export const getDepartments = () => request('/departments');
export const getDesignations = () => request('/designations');
export const getShifts = () => request('/shifts');
export const getDoctorProfiles = () => request('/doctors');
export const saveEmployee = (employee, payload) => request(
  employee?.id ? `/employees/${employee.id}` : '/employees',
  jsonOptions(employee?.id ? 'PUT' : 'POST', payload),
);
export const uploadEmployeeDocument = (employeeId, documentType, file) => {
  const form = new FormData();
  form.append('file', file);
  return request(`/employees/${employeeId}/documents/${documentType}`, { method: 'POST', body: form });
};
export const employeeDocumentUrl = (employeeId, documentType) => (
  `${API_BASE_URL}/employees/${employeeId}/documents/${documentType}`
);
