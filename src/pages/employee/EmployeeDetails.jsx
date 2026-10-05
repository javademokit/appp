import React from 'react';
import { HrField, HrStatusBadge, formatMoney, titleCase } from '../hrUi';

export default function EmployeeDetails({ employee }) {
  if (!employee) return null;
  const fullName = [employee.firstName, employee.lastName].filter(Boolean).join(' ') || employee.name;
  const professionalInfo = employee.professionalInfo || {};
  return <div className="hr-form">
    <div className="hr-form-section"><h3>{fullName}</h3><div className="hr-form-grid">
      <HrField label="Employee ID"><span>{employee.employeeCode || employee.id || '—'}</span></HrField>
      <HrField label="Employee type"><span>{titleCase(employee.employeeType)}</span></HrField>
      <HrField label="Doctor profile"><span>{employee.doctorProfileName || '—'}</span></HrField>
      <HrField label="Department"><span>{employee.departmentName || employee.department || '—'}</span></HrField>
      <HrField label="Designation"><span>{employee.designationName || employee.designation || '—'}</span></HrField>
      <HrField label="Status"><HrStatusBadge value={employee.status} /></HrField>
      <HrField label="Joining date"><span>{employee.joiningDate || '—'}</span></HrField>
      <HrField label="Mobile"><span>{employee.mobile || '—'}</span></HrField>
      <HrField label="Email"><span>{employee.email || '—'}</span></HrField>
    </div></div>
    <div className="hr-form-section"><h3>Professional information</h3><div className="hr-form-grid">
      <HrField label="Registration"><span>{professionalInfo.registrationNumber || '—'}</span></HrField>
      <HrField label="Qualification"><span>{professionalInfo.qualification || '—'}</span></HrField>
      <HrField label="Specialization"><span>{professionalInfo.specialization || '—'}</span></HrField>
      <HrField label="Experience"><span>{professionalInfo.experienceYears ? `${professionalInfo.experienceYears} years` : '—'}</span></HrField>
    </div></div>
    {employee.salary && <div className="hr-form-section"><h3>Current salary</h3>
      <strong>{formatMoney(employee.salary.netSalary)}</strong></div>}
  </div>;
}
