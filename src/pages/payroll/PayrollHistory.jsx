import React from 'react';
import { HrDataTable, HrPanelHeading, HrStatusBadge, asArray, formatMoney } from '../hrUi';

export default function PayrollHistory({ runs = [], busy, onAction, onPreview }) {
  return <section className="hr-panel">
    <HrPanelHeading title="Payroll runs" description="Review employee pay, approve runs and generate payslips." />
    <HrDataTable rows={asArray(runs)} emptyTitle="No payroll runs for this month"
      emptyDetail="Create a run to calculate pay for active employees." columns={[
        { key: 'month', label: 'Payroll month' }, { key: 'employeeCount', label: 'Employees' },
        { key: 'totalGross', label: 'Gross', render: (row) => formatMoney(row.totalGross) },
        { key: 'totalDeduction', label: 'Deductions', render: (row) => formatMoney(row.totalDeduction) },
        { key: 'totalNet', label: 'Net', render: (row) => formatMoney(row.totalNet) },
        { key: 'status', label: 'Status', render: (row) => <HrStatusBadge value={row.status} /> },
        { key: 'actions', label: 'Next step', render: (row) => {
          const status = String(row.status || '').toUpperCase();
          if (status === 'DRAFT') return <button className="hr-text-button" disabled={busy} onClick={() => onAction(row, 'calculate')}>Calculate</button>;
          if (status === 'CALCULATED' || status === 'PENDING_APPROVAL') return <div className="hr-row-actions">
            <button className="hr-text-button" onClick={() => onPreview(row)}>Preview</button>
            <button className="hr-text-button positive" disabled={busy} onClick={() => onAction(row, 'approve')}>Approve</button>
            <button className="hr-text-button negative" disabled={busy} onClick={() => onAction(row, 'reject')}>Reject</button>
          </div>;
          if (status === 'APPROVED') return <button className="hr-text-button positive" disabled={busy} onClick={() => onAction(row, 'process')}>Generate payslips</button>;
          if (status === 'PROCESSED') return <button className="hr-text-button positive" disabled={busy} onClick={() => onAction(row, 'paid')}>Mark paid</button>;
          if (status === 'REJECTED') return <button className="hr-text-button" disabled={busy} onClick={() => onAction(row, 'reset')}>Return to draft</button>;
          return <button className="hr-text-button" onClick={() => onPreview(row)}>View preview</button>;
        } },
      ]} />
  </section>;
}
