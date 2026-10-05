import React from 'react';
import { HrField, asArray } from '../hrUi';

export default function LeaveRequest({ employees = [], managerMode = false }) {
  return <div className="hr-form-grid">
    {managerMode && <HrField label="Employee" required><select name="employeeId" required><option value="">Select employee</option>
      {asArray(employees).map((item) => <option key={item.id} value={item.id}>
        {[item.firstName, item.lastName].filter(Boolean).join(' ')}</option>)}</select></HrField>}
    <HrField label="Leave type" required><select name="leaveType" required>
      {['CASUAL', 'SICK', 'ANNUAL', 'MATERNITY', 'PATERNITY', 'EMERGENCY', 'UNPAID'].map((type) =>
        <option key={type} value={type}>{type.replaceAll('_', ' ')}</option>)}</select></HrField>
    <HrField label="From date" required><input name="fromDate" type="date" required /></HrField>
    <HrField label="To date" required><input name="toDate" type="date" required /></HrField>
    <HrField label="Reason"><textarea name="reason" rows="3" /></HrField>
  </div>;
}
