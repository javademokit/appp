import React from 'react';
import { ArrowLeft, Check, ShieldAlert } from 'lucide-react';
import { formatMoney, asArray, titleCase, HrStatusBadge } from '../hrUi';
import './PayrollPreview.css';

const reviewSteps = ['Period', 'Inputs', 'Process', 'Review', 'Approve & lock', 'Pay'];
const formatNumber = (value) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 })
  .format(Number(value) || 0);

function activeStep(status) {
  switch (String(status || '').toUpperCase()) {
    case 'DRAFT': return 3;
    case 'CALCULATED':
    case 'PENDING_APPROVAL': return 4;
    case 'APPROVED': return 4;
    case 'PROCESSED': return 5;
    case 'PAID': return 6;
    default: return 1;
  }
}

function amountForCode(deductions, predicate) {
  return deductions.reduce((sum, component) => {
    const identity = `${component.code || ''} ${component.name || ''}`.toLowerCase();
    return predicate(identity) ? sum + (Number(component.amount) || 0) : sum;
  }, 0);
}

function payrollRow(item) {
  const deductions = asArray(item.deductions);
  const pf = amountForCode(deductions, (key) => /\bpf\b|provident/.test(key));
  const esi = amountForCode(deductions, (key) => /\besi\b|employee state/.test(key));
  const pt = amountForCode(deductions, (key) => /\bpt\b|professional tax/.test(key));
  const tds = amountForCode(deductions, (key) => /\btds\b|income tax/.test(key));
  const other = deductions.reduce((sum, component) => sum + (Number(component.amount) || 0), 0) - pf - esi - pt - tds;
  const flags = Array.isArray(item.flags) ? item.flags.filter(Boolean) : [];
  return {
    ...item,
    paidDays: item.paidDays ?? item.workingDays ?? '—',
    gross: Number(item.grossSalary ?? item.gross) || 0,
    pf,
    esi,
    pt,
    tds,
    other: Math.max(0, other),
    net: Number(item.netSalary ?? item.netPay) || 0,
    flags,
  };
}

function nextPayrollAction(status, canManagePayroll, canApprovePayroll, makerCanRequestApproval) {
  if (status === 'DRAFT' && canManagePayroll) return { step: 'calculate', label: 'Calculate payroll' };
  if (status === 'CALCULATED' && makerCanRequestApproval) {
    return { step: 'request-approval', label: 'Request approval' };
  }
  if (status === 'PENDING_APPROVAL' && canApprovePayroll) return { step: 'approve', label: 'Approve payroll' };
  if (status === 'APPROVED' && canManagePayroll) return { step: 'process', label: 'Generate payslips' };
  if (status === 'PROCESSED' && canManagePayroll) return { step: 'paid', label: 'Mark as paid' };
  if (status === 'REJECTED' && canManagePayroll) return { step: 'reset', label: 'Return to process' };
  return null;
}

export default function PayrollPreview({
  payroll, onClose, canManagePayroll = false, canApprovePayroll = false,
  makerCannotApprove = false, makerCanRequestApproval = false,
  awaitingApprovalRequest = false, busy = false, onAction,
}) {
  const items = asArray(payroll?.items || payroll?.entries).map(payrollRow);
  const status = String(payroll?.status || '').toUpperCase();
  const action = nextPayrollAction(status, canManagePayroll, canApprovePayroll, makerCanRequestApproval);
  const step = activeStep(status);
  const warningCount = items.reduce((total, item) => total + item.flags.length, 0);
  const monthLabel = payroll?.month
    ? new Date(`${payroll.month}-01T12:00:00`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : 'Payroll review';
  const runAction = () => {
    if (!action || !onAction) return;
    onAction(payroll, action.step);
    onClose?.();
  };

  return <section className="hr-payroll-review" aria-labelledby="payroll-review-title">
    <div className="hr-payroll-review-heading">
      <div>
        <span className="hr-payroll-review-eyebrow">PAYROLL RUN · {payroll?.month || ''}</span>
        <h2 id="payroll-review-title">Review payroll</h2>
        <p>Check employee pay and deductions before moving this run forward.</p>
      </div>
      <HrStatusBadge value={payroll?.status} />
    </div>

    <ol className="hr-payroll-stepper" aria-label="Payroll progress">
      {reviewSteps.map((label, index) => {
        const number = index + 1;
        const completed = number < step;
        const current = number === step;
        return <li key={label} className={`${completed ? 'completed' : ''}${current ? ' current' : ''}`}
          aria-current={current ? 'step' : undefined}>
          <span className="hr-payroll-step-number">{completed ? <Check size={14} /> : number}</span>
          <span>{label}</span>
        </li>;
      })}
    </ol>

    <div className="hr-payroll-review-stats">
      <article><span>Gross</span><strong>{formatMoney(payroll?.totalGross)}</strong></article>
      <article><span>Deductions</span><strong>{formatMoney(payroll?.totalDeduction)}</strong></article>
      <article className="net"><span>Net pay</span><strong>{formatMoney(payroll?.totalNet)}</strong></article>
      <article className="checks"><span>Checks</span><strong>{warningCount} {warningCount === 1 ? 'warning' : 'warnings'}</strong></article>
    </div>

    <div className="hr-payroll-review-table-wrap">
      <table className="hr-payroll-review-table">
        <thead><tr>
          <th scope="col">Employee</th>
          <th scope="col">Paid days</th>
          <th scope="col">Gross</th>
          <th scope="col">PF</th>
          <th scope="col">ESI</th>
          <th scope="col">PT</th>
          <th scope="col">TDS</th>
          <th scope="col">Other</th>
          <th scope="col">Net pay</th>
          <th scope="col">Flags</th>
        </tr></thead>
        <tbody>
          {items.map((item, index) => <tr key={item.employeeId || item.employeeCode || index}>
            <td className="employee"><strong>{item.employeeName || 'Employee'}</strong><small>{item.employeeCode || titleCase(item.employeeType || item.role)}</small></td>
            <td>{item.paidDays}</td>
            <td>{formatNumber(item.gross)}</td>
            <td>{formatNumber(item.pf)}</td>
            <td>{formatNumber(item.esi)}</td>
            <td>{formatNumber(item.pt)}</td>
            <td>{formatNumber(item.tds)}</td>
            <td>{formatNumber(item.other)}</td>
            <td className="net-cell">{formatNumber(item.net)}</td>
            <td>{item.flags.length
              ? <span className="hr-payroll-flag warning"><ShieldAlert size={13} />{item.flags.join(', ')}</span>
              : <span className="hr-payroll-flag ok"><Check size={12} />None reported</span>}</td>
          </tr>)}
        </tbody>
      </table>
      {!items.length && <div className="hr-payroll-review-empty">No employee pay details are available for this run yet.</div>}
    </div>

    {makerCannotApprove && <p className="hr-approval-blocked-message" role="note">
      {status === 'CALCULATED'
        ? 'Request approval to send this payroll run to a different authorized user.'
        : 'You requested approval. An authorized user on a different account must approve this run.'}
    </p>}
    {awaitingApprovalRequest && <p className="hr-approval-blocked-message" role="note">
      The payroll maker must request approval before an approver can review this run.
    </p>}
    <footer className="hr-payroll-review-actions">
      <button type="button" className="hr-payroll-back" onClick={onClose}><ArrowLeft size={16} /> Back to process</button>
      {action && <button type="button" className="hr-payroll-next" disabled={busy} onClick={runAction}>
        {action.label}
      </button>}
    </footer>
    <p className="hr-payroll-review-month">{monthLabel}</p>
  </section>;
}
