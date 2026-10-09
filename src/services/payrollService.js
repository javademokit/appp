import { request, jsonOptions, apiResponse } from './hrRequest';

export const getDashboard = (month) => request(`/hr/dashboard?month=${encodeURIComponent(month)}`);
export const getPayrollRuns = (month) => request(month
  ? `/payroll?month=${encodeURIComponent(month)}`
  : '/payroll');
export const getPayrollHistory = (month) => getPayrollRuns(month);
export const createPayrollRun = (month) => request('/payroll/run', jsonOptions('POST', { month }));
export const performPayrollStep = (payroll, step) => request(
  `/payroll/${payroll.id}/${step}`,
  jsonOptions('POST', {}),
);
export const getPayslips = (month) => request(`/payslips?month=${encodeURIComponent(month)}`);
export const getMyPayslips = () => request('/payroll/me/payslips');
export const downloadPayslip = (payslip) => apiResponse(`/payslips/${payslip.id}/download`);
export const getReports = (month) => request(`/reports/hr?month=${encodeURIComponent(month)}`);
export const exportReport = (month) => apiResponse(`/reports/hr?month=${encodeURIComponent(month)}&format=csv`);
export const createOrganizationRecord = (kind, payload) => request(
  `/${kind === 'employeeType' ? 'employee-types' : `${kind}s`}`,
  jsonOptions('POST', payload),
);
