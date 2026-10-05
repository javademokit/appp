import React from 'react';
import { Plus } from 'lucide-react';
import { HrDataTable, HrPanelHeading, HrStatusBadge, asArray, titleCase } from '../hrUi';

export default function Attendance({ records = [], canManage, onRecord }) {
  const statuses = ['PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE'];
  return <section className="hr-panel">
    <HrPanelHeading title="Attendance register" description="Track attendance, check-in times and overtime."
      action={canManage && <button className="hr-button primary" onClick={onRecord}><Plus size={16} /> Record attendance</button>} />
    <div className="hr-inline-stats">{statuses.map((status) => <div key={status}><span>{titleCase(status)}</span>
      <strong>{asArray(records).filter((item) => item.status === status).length}</strong></div>)}</div>
    <HrDataTable rows={asArray(records)} columns={[
      { key: 'attendanceDate', label: 'Date' }, { key: 'employeeName', label: 'Employee' },
      { key: 'employeeType', label: 'Type', render: (row) => titleCase(row.employeeType) },
      { key: 'checkIn', label: 'Check in' }, { key: 'checkOut', label: 'Check out' },
      { key: 'workedHours', label: 'Hours' }, { key: 'overtimeHours', label: 'Overtime' },
      { key: 'status', label: 'Status', render: (row) => <HrStatusBadge value={row.status} /> },
    ]} />
  </section>;
}
