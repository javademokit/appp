import { useState } from 'react';
import { ArrowUpRight, CircleCheck, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import { formatMoney, HrDataTable, HrPanelHeading, HrStatusBadge } from '../hrUi';
import './FinanceApprovalDashboard.css';

const ollamaUrl = (process.env.REACT_APP_OLLAMA_URL || 'http://localhost:11434').replace(/\/+$/, '');
const ollamaModel = process.env.REACT_APP_OLLAMA_MODEL || 'llama3.2:latest';
const asArray = (value) => Array.isArray(value) ? value : [];

function isLocalOllamaUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  } catch {
    return false;
  }
}

function isPayrollMaker(run, user) {
  const maker = String(run?.createdBy || '').trim().toLowerCase();
  return Boolean(maker && [user?.email, user?.emailId, user?.username]
    .some((identity) => String(identity || '').trim().toLowerCase() === maker));
}

export default function FinanceApprovalDashboard({
  runs = [],
  currentUser,
  canApprovePayroll = false,
  allowAdminSelfApproval = false,
  onReview,
}) {
  const [brief, setBrief] = useState('');
  const [briefError, setBriefError] = useState('');
  const [briefLoading, setBriefLoading] = useState(false);
  const allRuns = asArray(runs);
  const pendingRuns = allRuns.filter((run) => String(run.status || '').toUpperCase() === 'PENDING_APPROVAL');
  const waitingRuns = allRuns.filter((run) => String(run.status || '').toUpperCase() === 'CALCULATED');
  const pendingGross = pendingRuns.reduce((sum, run) => sum + (Number(run.totalGross) || 0), 0);
  const pendingNet = pendingRuns.reduce((sum, run) => sum + (Number(run.totalNet) || 0), 0);
  const employeeCount = pendingRuns.reduce((sum, run) => (
    sum + (Number(run.employeeCount) || asArray(run.items || run.entries).length)
  ), 0);
  const totalFlags = pendingRuns.reduce((sum, run) => sum + asArray(run.items || run.entries)
    .reduce((itemSum, item) => itemSum + asArray(item.flags).filter(Boolean).length, 0), 0);

  const requestLocalBrief = async () => {
    setBrief('');
    setBriefError('');
    setBriefLoading(true);
    try {
      if (!isLocalOllamaUrl(ollamaUrl) || ollamaModel.toLowerCase().includes(':cloud')) {
        throw new Error('Finance summaries require a local Ollama URL and a locally installed model.');
      }

      const tagsResponse = await fetch(`${ollamaUrl}/api/tags`);
      if (!tagsResponse.ok) throw new Error(`Ollama model check failed (${tagsResponse.status}).`);
      const tags = await tagsResponse.json();
      const localModel = asArray(tags.models).find((model) => (
        model.name === ollamaModel || model.model === ollamaModel
      ));
      if (!localModel || localModel.remote_host || localModel.remote_model) {
        throw new Error(`The local model ${ollamaModel} is not installed. Install it with Ollama and try again.`);
      }

      const response = await fetch(`${ollamaUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: ollamaModel,
          stream: false,
          messages: [
            {
              role: 'system',
              content: 'Write a short, neutral finance review brief using only the aggregate figures provided. State that every payroll run must be checked in the CRM before approval. Never approve or reject payroll, make up facts, or request employee details.',
            },
            {
              role: 'user',
              content: JSON.stringify({
                pendingRunCount: pendingRuns.length,
                pendingEmployeeCount: employeeCount,
                pendingGrossTotal: pendingGross,
                pendingNetTotal: pendingNet,
                pendingCheckWarnings: totalFlags,
                runsAwaitingMakerSubmission: waitingRuns.length,
              }),
            },
          ],
        }),
      });
      if (!response.ok) throw new Error(`Local Ollama returned HTTP ${response.status}.`);
      const data = await response.json();
      const content = data.message?.content?.trim();
      if (!content) throw new Error('Local Ollama returned an empty summary.');
      setBrief(content);
    } catch (error) {
      setBriefError(error.message || 'Could not create a local finance review brief.');
    } finally {
      setBriefLoading(false);
    }
  };

  const columns = [
    { key: 'month', label: 'Payroll period' },
    { key: 'employeeCount', label: 'Employees' },
    { key: 'totalGross', label: 'Gross', render: (run) => formatMoney(run.totalGross) },
    { key: 'totalDeduction', label: 'Deductions', render: (run) => formatMoney(run.totalDeduction) },
    { key: 'totalNet', label: 'Net pay', render: (run) => formatMoney(run.totalNet) },
    { key: 'status', label: 'Status', render: (run) => <HrStatusBadge value={run.status} /> },
    {
      key: 'review',
      label: 'Review',
      render: (run) => {
        const canApproveRun = canApprovePayroll
          && (allowAdminSelfApproval || !isPayrollMaker(run, currentUser));
        return <div className="finance-approval-row-action">
          <button type="button" className="hr-text-button" onClick={() => onReview?.(run)}>
            Review details <ArrowUpRight size={14} />
          </button>
          {String(run.status || '').toUpperCase() === 'PENDING_APPROVAL' && canApprovePayroll
            && !canApproveRun && <span className="hr-approval-blocked">Different approver required</span>}
        </div>;
      },
    },
  ];

  return <section className="finance-approval-dashboard" aria-label="Finance payroll approvals">
    <div className="finance-approval-intro">
      <div>
        <p className="hr-eyebrow">FINANCE WORKSPACE</p>
        <h2>Review payroll before approval</h2>
        <p>Verify totals and payroll checks, then open a run to review its employee-level details.</p>
      </div>
      <span className="finance-approval-security"><ShieldCheck size={17} /> Role-based approval controls</span>
    </div>

    <div className="finance-approval-metrics">
      <article><span className="finance-metric-icon amber"><Clock3 size={18} /></span>
        <span className="finance-metric-label">Awaiting finance review</span><strong>{pendingRuns.length}</strong>
        <small>{employeeCount} employees across pending runs</small>
      </article>
      <article><span className="finance-metric-icon teal"><CircleCheck size={18} /></span>
        <span className="finance-metric-label">Pending net pay</span><strong>{formatMoney(pendingNet)}</strong>
        <small>{formatMoney(pendingGross)} gross before deductions</small>
      </article>
      <article><span className={`finance-metric-icon ${totalFlags ? 'amber' : 'teal'}`}><ShieldCheck size={18} /></span>
        <span className="finance-metric-label">Payroll check warnings</span><strong>{totalFlags}</strong>
        <small>{waitingRuns.length} calculated run{waitingRuns.length === 1 ? '' : 's'} awaiting maker submission</small>
      </article>
    </div>

    <section className="finance-ai-brief" aria-labelledby="finance-ai-title">
      <div className="finance-ai-heading">
        <span className="finance-ai-icon"><Sparkles size={17} /></span>
        <div><h3 id="finance-ai-title">Local Ollama review brief</h3>
          <p>Uses aggregate totals only. Employee names and payroll line items stay out of the prompt.</p>
        </div>
      </div>
      <button type="button" className="hr-button secondary" onClick={requestLocalBrief} disabled={briefLoading}>
        {briefLoading ? 'Generating locally…' : 'Generate brief'}
      </button>
      {briefError && <p className="finance-ai-error" role="alert">{briefError}</p>}
      {brief && <p className="finance-ai-response" role="status">{brief}</p>}
      <small>AI summaries are informational; verify the payroll record before taking action.</small>
    </section>

    <section className="hr-panel finance-approval-queue" aria-label="Pending payroll approvals">
      <HrPanelHeading
        title="Pending approval queue"
        description="Only runs submitted by their maker appear here. Open a run to inspect its details before approving."
      />
      <HrDataTable
        rows={pendingRuns}
        columns={columns}
        emptyTitle="No payroll approvals pending"
        emptyDetail="Submitted payroll runs will appear here when they are ready for finance review."
      />
    </section>

    {waitingRuns.length > 0 && <p className="finance-approval-waiting" role="note">
      {waitingRuns.length} calculated run{waitingRuns.length === 1 ? ' is' : 's are'} waiting for the payroll maker to request approval.
    </p>}
  </section>;
}
