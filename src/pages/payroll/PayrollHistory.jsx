import React from 'react';
import { HrDataTable, HrPanelHeading, HrStatusBadge, asArray, formatMoney } from '../hrUi';

export default function PayrollHistory({
  runs = [], busy, canManagePayroll, canApprovePayroll, onAction, onPreview,
}) {
  return <section className="hr-panel">
    <HrPanelHeading title="Payroll runs" description={canManagePayroll
      ? 'Review employee pay, calculate payroll, approve runs and generate payslips.'
      : 'Review calculated payroll runs and approve them for processing.'} />
    <HrDataTable rows={asArray(runs)} emptyTitle="No payroll runs for this month"
      emptyDetail="Create a run to calculate pay for active employees." columns={[
        { key: 'month', label: 'Payroll month' }, { key: 'employeeCount', label: 'Employees' },
        { key: 'totalGross', label: 'Gross', render: (row) => formatMoney(row.totalGross) },
        { key: 'totalDeduction', label: 'Deductions', render: (row) => formatMoney(row.totalDeduction) },
        { key: 'totalNet', label: 'Net', render: (row) => formatMoney(row.totalNet) },
        { key: 'status', label: 'Status', render: (row) => <HrStatusBadge value={row.status} /> },
        { key: 'actions', label: 'Next step', render: (row) => {
          const status = String(row.status || '').toUpperCase();
          if (status === 'DRAFT') return canManagePayroll
            ? <button className="hr-text-button" disabled={busy} onClick={() => onAction(row, 'calculate')}>Calculate</button>
            : <span>Awaiting calculation</span>;
          if (status === 'CALCULATED' || status === 'PENDING_APPROVAL') return <div className="hr-row-actions">
            <button className="hr-text-button" onClick={() => onPreview(row)}>Preview</button>
            {canApprovePayroll && <button className="hr-text-button positive" disabled={busy} onClick={() => onAction(row, 'approve')}>Approve</button>}
            {canManagePayroll && <button className="hr-text-button negative" disabled={busy} onClick={() => onAction(row, 'reject')}>Reject</button>}
          </div>;
          if (status === 'APPROVED') return canManagePayroll
            ? <button className="hr-text-button positive" disabled={busy} onClick={() => onAction(row, 'process')}>Generate payslips</button>
            : <span>Approved</span>;
          if (status === 'PROCESSED') return canManagePayroll
            ? <button className="hr-text-button positive" disabled={busy} onClick={() => onAction(row, 'paid')}>Mark paid</button>
            : <span>Processed</span>;
          if (status === 'REJECTED') return canManagePayroll
            ? <button className="hr-text-button" disabled={busy} onClick={() => onAction(row, 'reset')}>Return to draft</button>
            : <span>Rejected</span>;
          return <button className="hr-text-button" onClick={() => onPreview(row)}>View preview</button>;
        } },
      ]} />
  </section>;
}
