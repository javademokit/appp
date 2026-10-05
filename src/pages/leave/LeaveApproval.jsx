import React from 'react';
import { Plus } from 'lucide-react';
import { HrDataTable, HrPanelHeading, HrStatusBadge, asArray, titleCase } from '../hrUi';

export default function LeaveApproval({ requests = [], canApprove, onRequest, onDecision }) {
  return <section className="hr-panel">
    <HrPanelHeading title="Leave requests" description="Review requests and keep attendance and payroll in sync."
      action={<button className="hr-button primary" onClick={onRequest}><Plus size={16} /> Request leave</button>} />
    <HrDataTable rows={asArray(requests)} columns={[
      { key: 'employeeName', label: 'Employee' },
      { key: 'leaveType', label: 'Leave type', render: (row) => titleCase(row.leaveType) },
      { key: 'fromDate', label: 'From' }, { key: 'toDate', label: 'To' }, { key: 'reason', label: 'Reason' },
      { key: 'status', label: 'Status', render: (row) => <HrStatusBadge value={row.status} /> },
      { key: 'actions', label: 'Actions', render: (row) => row.status === 'PENDING' && canApprove
        ? <div className="hr-row-actions"><button className="hr-text-button positive" onClick={() => onDecision(row, 'approve')}>Approve</button>
          <button className="hr-text-button negative" onClick={() => onDecision(row, 'reject')}>Reject</button></div> : '—' },
    ]} />
  </section>;
}
