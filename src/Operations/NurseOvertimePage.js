import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import OvertimeAllowances from '../pages/payroll/OvertimeAllowances';
import './Operations.css';
import './PayrollPage.css';

const currentMonth = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

export default function NurseOvertimePage({ canApprove }) {
  const [month, setMonth] = useState(currentMonth);

  return (
    <section className="workflow-page" aria-labelledby="nurse-overtime-title">
      <header className="workflow-header">
        <div>
          <p className="workflow-eyebrow">People operations</p>
          <h1 id="nurse-overtime-title">{canApprove ? 'Overtime approvals' : 'My overtime requests'}</h1>
          <p>{canApprove
            ? 'Review nurse overtime claims, record approved allowance amounts, and track decisions.'
            : 'Submit overtime you have worked and track its approval status.'}</p>
        </div>
        {canApprove && <label className="hr-month-picker">
          <CalendarDays size={16} />
          <span className="sr-only">Approval month</span>
          <input aria-label="Approval month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
        </label>}
      </header>
      <OvertimeAllowances
        month={month}
        canApprove={canApprove}
        title={canApprove ? 'Nurse overtime claims' : 'Overtime request history'}
      />
    </section>
  );
}
