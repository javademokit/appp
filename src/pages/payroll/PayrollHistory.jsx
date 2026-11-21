import React from 'react';
import { HrDataTable, HrPanelHeading, HrStatusBadge, asArray, formatMoney } from '../hrUi';

const isPayrollMaker = (payroll, user) => {
  const maker = String(payroll?.createdBy || '').trim().toLowerCase();
  return Boolean(maker && [user?.email, user?.emailId, user?.username]
    .some((identity) => String(identity || '').trim().toLowerCase() === maker));
};

export default function PayrollHistory({
  runs = [], busy, canManagePayroll, canApprovePayroll, currentUser, onAction, onPreview, onReopen,
  allowAdminSelfApproval = false, historyMode = false,
}) {
  return <section className="hr-panel">
    <HrPanelHeading title={historyMode ? 'Payroll History' : 'Payroll runs'} description={historyMode
      ? 'All payroll runs across pay periods, with their current status and review actions.'
      : canManagePayroll
      ? 'Calculate payroll, request approval, review decisions and generate payslips.'
      : 'Review calculated payroll runs and approve them for processing.'} />
    <HrDataTable rows={asArray(runs)} emptyTitle={historyMode ? 'No payroll history yet' : 'No payroll runs for this month'}
      emptyDetail={historyMode ? 'Payroll runs will appear here after they are created.'
        : 'Create a run to calculate pay for active employees.'} columns={[
        { key: 'month', label: 'Payroll month' }, { key: 'employeeCount', label: 'Employees' },
        { key: 'totalGross', label: 'Gross', render: (row) => formatMoney(row.totalGross) },
        { key: 'totalDeduction', label: 'Deductions', render: (row) => formatMoney(row.totalDeduction) },
        { key: 'totalNet', label: 'Net', render: (row) => formatMoney(row.totalNet) },
        { key: 'status', label: 'Status', render: (row) => <HrStatusBadge value={row.status} /> },
        { key: 'actions', label: 'Next step', render: (row) => {
          const status = String(row.status || '').toUpperCase();
          if (status === 'DRAFT') return canManagePayroll
            ? <div className="hr-row-actions">
              <button className="hr-text-button" onClick={() => onPreview(row)}>Open draft</button>
              <button className="hr-text-button positive" disabled={busy} onClick={() => onAction(row, 'calculate')}>Calculate</button>
            </div>
            : <span>Awaiting calculation</span>;
          if (status === 'CALCULATED' || status === 'PENDING_APPROVAL') return <div className="hr-row-actions">
            <button className="hr-text-button" onClick={() => onPreview(row)}>Preview</button>
            {status === 'CALCULATED' && canManagePayroll && isPayrollMaker(row, currentUser)
              && <button className="hr-text-button positive" disabled={busy}
                onClick={() => onAction(row, 'request-approval')}>Request approval</button>}
            {status === 'CALCULATED' && !isPayrollMaker(row, currentUser)
              && <span className="hr-approval-blocked" title="The payroll maker must submit this run for approval first">
                Awaiting request
              </span>}
            {status === 'PENDING_APPROVAL' && canApprovePayroll && (allowAdminSelfApproval || !isPayrollMaker(row, currentUser))
              && <button className="hr-text-button positive" disabled={busy} onClick={() => onAction(row, 'approve')}>Approve</button>}
            {status === 'PENDING_APPROVAL' && canApprovePayroll && !allowAdminSelfApproval && isPayrollMaker(row, currentUser)
              && <span className="hr-approval-blocked" title="Use a different authorized account to approve this run">
                Awaiting another approver
              </span>}
            {canManagePayroll && <button className="hr-text-button negative" disabled={busy} onClick={() => onAction(row, 'reject')}>Reject</button>}
          </div>;
          if (status === 'APPROVED') return canManagePayroll
            ? <button className="hr-text-button positive" disabled={busy} onClick={() => onAction(row, 'process')}>Generate payslips</button>
            : <span>Approved</span>;
          if (status === 'PROCESSED') return canManagePayroll
            ? <div className="hr-row-actions">
              <button className="hr-text-button positive" disabled={busy} onClick={() => onAction(row, 'paid')}>Mark paid</button>
              {onReopen && <button className="hr-text-button negative" disabled={busy} onClick={() => onReopen(row)}>Reopen</button>}
            </div>
            : <span>Processed</span>;
          if (status === 'PAID') return canManagePayroll
            ? <div className="hr-row-actions">
              <button className="hr-text-button" onClick={() => onPreview(row)}>View paid run</button>
              {onReopen && <button className="hr-text-button negative" disabled={busy} onClick={() => onReopen(row)}>Reopen</button>}
            </div>
            : <span>Paid</span>;
          if (status === 'REJECTED') return canManagePayroll
            ? <button className="hr-text-button" disabled={busy} onClick={() => onAction(row, 'reset')}>Return to draft</button>
            : <span>Rejected</span>;
          return <button className="hr-text-button" onClick={() => onPreview(row)}>View preview</button>;
        } },
      ]} />
  </section>;
}
