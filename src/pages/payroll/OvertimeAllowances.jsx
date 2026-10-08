import React, { useCallback, useEffect, useState } from 'react';
import { Check, Clock3, Plus, X } from 'lucide-react';
import * as overtimeService from '../../services/overtimeAllowanceService';
import { HrDataTable, HrPanelHeading, HrStatusBadge, formatMoney } from '../hrUi';

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function OvertimeAllowances({ month, canApprove, title = 'Overtime allowances' }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [amounts, setAmounts] = useState({});
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setRequests(await overtimeService.getOvertimeAllowances(month, canApprove));
    } catch (requestError) {
      setError(requestError.message || 'Could not load overtime allowance requests');
    } finally {
      setLoading(false);
    }
  }, [month, canApprove]);

  useEffect(() => { void refresh(); }, [refresh]);

  const requestAllowance = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await overtimeService.requestOvertimeAllowance({
        overtimeDate: form.get('overtimeDate'),
        hours: Number(form.get('hours')),
        reason: form.get('reason'),
      });
      setShowRequest(false);
      setNotice('Overtime request submitted for approval.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not submit overtime allowance request');
    } finally {
      setSubmitting(false);
    }
  };

  const decide = async (requestRecord, decision) => {
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      await overtimeService.decideOvertimeAllowance(
        requestRecord, decision, amounts[requestRecord.id],
      );
      setNotice(decision === 'approve'
        ? 'Allowance approved and will be included in the matching draft payroll.'
        : 'Overtime allowance request rejected.');
      await refresh();
    } catch (requestError) {
      setError(requestError.message || 'Could not update overtime allowance request');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    ...(canApprove ? [{ key: 'employeeName', label: 'Employee', render: (row) => (
      <span><strong>{row.employeeName || '—'}</strong><br />{row.employeeCode || '—'}</span>
    ) }] : []),
    { key: 'overtimeDate', label: 'Overtime date' },
    { key: 'hours', label: 'Hours' },
    { key: 'reason', label: 'Reason' },
    { key: 'month', label: 'Payroll month' },
    { key: 'approvedAmount', label: 'Approved allowance', render: (row) => (
      row.approvedAmount == null ? '—' : formatMoney(row.approvedAmount)
    ) },
    { key: 'status', label: 'Status', render: (row) => <HrStatusBadge value={row.status} /> },
    ...(canApprove ? [{ key: 'actions', label: 'Decision', render: (row) => row.status === 'PENDING'
      ? <div className="hr-overtime-decision">
        <input aria-label={`Approved amount for ${row.employeeName}`} type="number" min="0.01" step="0.01"
          value={amounts[row.id] || ''} onChange={(event) => setAmounts((current) => ({
            ...current, [row.id]: event.target.value,
          }))} placeholder="Amount (₹)" />
        <button type="button" className="hr-text-button positive" disabled={submitting || !(Number(amounts[row.id]) > 0)}
          onClick={() => decide(row, 'approve')} aria-label={`Approve ${row.employeeName}`}>
          <Check size={16} /> Approve
        </button>
        <button type="button" className="hr-text-button negative" disabled={submitting}
          onClick={() => decide(row, 'reject')} aria-label={`Reject ${row.employeeName}`}>
          <X size={16} /> Reject
        </button>
      </div> : '—',
    }] : []),
  ];

  return <section className="hr-panel">
    <HrPanelHeading title={title}
      description={canApprove
        ? `Review overtime requests and set approved allowance amounts for the ${month} payroll.`
        : 'Apply for overtime already worked. Approved allowances are included in the relevant monthly payroll.'}
      action={!canApprove && <button className="hr-button primary" onClick={() => setShowRequest((open) => !open)}>
        <Plus size={16} /> Apply for overtime
      </button>} />
    {error && <div className="hr-alert error" role="alert">{error}</div>}
    {notice && <div className="hr-alert success" role="status">{notice}</div>}
    {showRequest && <form className="hr-overtime-form" onSubmit={requestAllowance}>
      <label className="hr-field"><span>Overtime date *</span>
        <input name="overtimeDate" type="date" max={today()} required />
      </label>
      <label className="hr-field"><span>Hours *</span>
        <input name="hours" type="number" min="0.25" max="24" step="0.25" required />
      </label>
      <label className="hr-field"><span>Reason *</span>
        <input name="reason" maxLength="500" required />
      </label>
      <button className="hr-button primary" type="submit" disabled={submitting}>
        <Clock3 size={16} /> Submit overtime request
      </button>
    </form>}
    {loading ? <div className="hr-loading" role="status">Loading overtime requests…</div>
      : <HrDataTable rows={requests} columns={columns}
        emptyTitle="No overtime requests"
        emptyDetail={canApprove ? `There are no requests for ${month}.` : 'Your overtime requests will appear here for status tracking.'} />}
  </section>;
}
