import React from 'react';
import {
  ArrowRight, BriefcaseBusiness, CalendarDays, CheckCircle2, Users, UserPlus,
} from 'lucide-react';
import { HrPanelHeading, HrStatusBadge, formatMoney } from '../hrUi';

export default function HRDashboard({ data = {}, onNavigate }) {
  const cards = [
    { label: 'Total employees', value: data.totalEmployees, icon: Users, tone: 'green' },
    { label: 'Active employees', value: data.activeEmployees, icon: CheckCircle2, tone: 'blue' },
    { label: 'On leave', value: data.onLeave, icon: CalendarDays, tone: 'amber' },
    { label: 'Notice period', value: data.noticePeriod, icon: BriefcaseBusiness, tone: 'violet' },
    { label: 'New joiners this month', value: data.newJoiners, icon: UserPlus, tone: 'green' },
  ];
  const payroll = data.payrollSummary || {};
  const attendance = data.attendanceToday || {};
  const pending = data.pendingActions || {};
  return <div className="hr-overview">
    <div className="hr-stats-grid">{cards.map(({ label, value, icon: Icon, tone }) => <article className="hr-stat-card" key={label}>
      <span className={`hr-stat-icon ${tone}`}><Icon size={19} /></span><span>{label}</span><strong>{value ?? '—'}</strong>
    </article>)}</div>
    <div className="hr-overview-grid">
      <section className="hr-panel hr-payroll-feature">
        <div className="hr-panel-heading"><div><p className="hr-eyebrow">MONTHLY PAYROLL</p><h2>{payroll.month || 'Current pay cycle'}</h2></div>
          <HrStatusBadge value={payroll.status || 'NOT STARTED'} /></div>
        <div className="hr-payroll-metrics">
          <div><span>Gross payroll</span><strong>{formatMoney(payroll.totalGross)}</strong></div>
          <div><span>Deductions</span><strong>{formatMoney(payroll.totalDeduction)}</strong></div>
          <div className="net"><span>Net payroll</span><strong>{formatMoney(payroll.totalNet)}</strong></div>
        </div>
        <button className="hr-link-button" onClick={() => onNavigate('payroll')}>Review payroll <ArrowRight size={16} /></button>
      </section>
      <section className="hr-panel">
        <HrPanelHeading title="Attendance today" description="Current workforce check-in summary." />
        <div className="hr-attendance-summary">
          {[['Present', attendance.present, 'present'], ['Absent', attendance.absent, 'absent'], ['On leave', attendance.onLeave, 'leave']].map(([label, value, key]) =>
            <div key={key}><span className={`hr-summary-dot ${key}`} />{label}<strong>{value ?? '—'}</strong></div>)}
        </div>
      </section>
    </div>
    <section className="hr-panel hr-pending-panel">
      <HrPanelHeading title="Pending actions" description="Items that need your attention." />
      <div className="hr-pending-grid">
        {[['Employee onboarding', pending.onboarding, 'employees'], ['Leave approvals', pending.leaveApprovals, 'leaves'],
          ['Payroll approval', pending.payrollApprovals, 'payroll'], ['Documents pending', pending.documents, 'employees']].map(([label, value, target]) =>
          <button key={label} onClick={() => onNavigate(target)}><span>{label}</span><strong>{value ?? 0}</strong><ArrowRight size={16} /></button>)}
      </div>
    </section>
  </div>;
}
