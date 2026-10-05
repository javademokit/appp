import React from 'react';
import { HrDataTable, HrStatusBadge, titleCase } from '../hrUi';

export default function EmployeeList({ employees, onEdit, onDetails }) {
  return <HrDataTable rows={employees} emptyTitle="No employees yet"
    emptyDetail="Add the first employee to start building your HR master." columns={[
      { key: 'employeeCode', label: 'Employee ID' },
      { key: 'name', label: 'Employee', render: (row) => <strong>{[row.firstName, row.lastName].filter(Boolean).join(' ') || row.name}</strong> },
      { key: 'employeeType', label: 'Type', render: (row) => titleCase(row.employeeType) },
      { key: 'doctorProfileName', label: 'Doctor profile', render: (row) => row.doctorProfileName || '—' },
      { key: 'departmentName', label: 'Department', render: (row) => row.departmentName || row.department || '—' },
      { key: 'designationName', label: 'Designation', render: (row) => row.designationName || row.designation || '—' },
      { key: 'joiningDate', label: 'Joined' },
      { key: 'status', label: 'Status', render: (row) => <HrStatusBadge value={row.status} /> },
      { key: 'actions', label: 'Actions', render: (row) => <div className="hr-row-actions">
        <button className="hr-text-button" onClick={() => onDetails(row)}>Details</button>
        <button className="hr-text-button" onClick={() => onEdit(row)}>Edit</button>
      </div> },
    ]} />;
}
