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
