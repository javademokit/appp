import React from 'react';
import { X } from 'lucide-react';
import { HrDataTable, HrStatusBadge, formatMoney, asArray, titleCase } from '../hrUi';

export default function PayrollPreview({ payroll, onClose }) {
  const items = asArray(payroll?.items || payroll?.entries);
  return <div className="hr-preview">
    <div className="hr-panel-heading"><div><p className="hr-eyebrow">PAYROLL PREVIEW</p><h2>{payroll?.month}</h2></div>
      <div className="hr-row-actions"><HrStatusBadge value={payroll?.status} />
        {onClose && <button className="hr-icon-button" aria-label="Close preview" onClick={onClose}><X size={18} /></button>}</div></div>
    <div className="hr-run-summary">
      <div><span>Employees</span><strong>{payroll?.employeeCount ?? items.length}</strong></div>
      <div><span>Gross payroll</span><strong>{formatMoney(payroll?.totalGross)}</strong></div>
      <div><span>Deductions</span><strong>{formatMoney(payroll?.totalDeduction)}</strong></div>
      <div><span>Net payroll</span><strong>{formatMoney(payroll?.totalNet)}</strong></div>
    </div>
    <HrDataTable rows={items} columns={[
      { key: 'employeeName', label: 'Employee' },
      { key: 'employeeType', label: 'Role', render: (row) => titleCase(row.employeeType || row.role) },
      { key: 'grossSalary', label: 'Gross', render: (row) => formatMoney(row.grossSalary ?? row.gross) },
      { key: 'totalDeduction', label: 'Deduction', render: (row) => formatMoney(row.totalDeduction ?? row.deduction) },
      { key: 'netSalary', label: 'Net', render: (row) => formatMoney(row.netSalary ?? row.netPay) },
    ]} emptyTitle="No payroll line items" emptyDetail="Calculate this run to preview employee pay." />
  </div>;
}
