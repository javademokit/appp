import React from 'react';
import { ArrowDownToLine } from 'lucide-react';
import { HrPanelHeading, formatMoney, asArray } from '../hrUi';
import BrandLogo from '../../components/BrandLogo';

const amount = (item) => item.amount ?? item.value ?? 0;

export function PayslipDetails({ payslip, onClose }) {
  if (!payslip) return null;
  const components = asArray(payslip.components || payslip.salaryComponents || payslip.items);
  const earnings = asArray(payslip.earnings || payslip.earningItems).length
    ? asArray(payslip.earnings || payslip.earningItems)
    : components.filter((item) => String(item.type || item.componentType).toUpperCase() === 'EARNING');
  const deductions = asArray(payslip.deductions || payslip.deductionItems).length
    ? asArray(payslip.deductions || payslip.deductionItems)
    : components.filter((item) => String(item.type || item.componentType).toUpperCase() === 'DEDUCTION');
  return <section className="hr-panel hr-payslip">
    <HrPanelHeading title="Payslip" description={`${payslip.payslipNumber || 'Monthly payslip'} · ${payslip.month || ''}`}
      action={<div className="hr-row-actions">
        {payslip.onDownload && <button className="hr-button secondary" onClick={() => payslip.onDownload(payslip)}>
          <ArrowDownToLine size={16} /> Download PDF</button>}
        {onClose && <button className="hr-text-button" onClick={onClose}>Close</button>}
      </div>} />
    <div className="hr-payslip-identity">
      <div className="hr-payslip-brand"><BrandLogo className="hr-payslip-logo" />
        <span><strong>MONTHLY SALARY SLIP</strong></span>
      </div>
      <span><b>Employee</b>{payslip.employeeName || '—'}</span>
      <span><b>Employee ID</b>{payslip.employeeCode || '—'}</span>
      <span><b>Designation</b>{payslip.designation || payslip.designationName || '—'}</span>
      <span><b>Department</b>{payslip.department || payslip.departmentName || '—'}</span>
      <span><b>Pay period</b>{payslip.month || '—'}</span>
      <span><b>PAN</b>{payslip.panNumber || '—'}</span>
      <span><b>Aadhaar</b>{payslip.aadhaarLastFour ? `•••• •••• ${payslip.aadhaarLastFour}` : '—'}</span>
      <span><b>PF / UAN number</b>{payslip.pfUanNumber || '—'}</span>
    </div>
    <div className="hr-payslip-columns">
      <section><h3>Earnings</h3>{earnings.length ? earnings.map((item, index) =>
        <div className="hr-payslip-line" key={item.id || item.code || index}><span>{item.name || item.componentName || item.code}</span><strong>{formatMoney(amount(item))}</strong></div>)
        : <p className="hr-page-subtitle">Earning breakdown is not available for this payslip.</p>}
        <div className="hr-payslip-line total"><span>Gross salary</span><strong>{formatMoney(payslip.grossSalary ?? payslip.totalGross)}</strong></div>
      </section>
      <section><h3>Deductions</h3>{deductions.length ? deductions.map((item, index) =>
        <div className="hr-payslip-line" key={item.id || item.code || index}><span>{item.name || item.componentName || item.code}</span><strong>{formatMoney(amount(item))}</strong></div>)
        : <p className="hr-page-subtitle">Deduction breakdown is not available for this payslip.</p>}
        <div className="hr-payslip-line total"><span>Total deduction</span><strong>{formatMoney(payslip.totalDeduction ?? payslip.deduction)}</strong></div>
      </section>
    </div>
    <div className="hr-payslip-net"><span>Net salary</span><strong>{formatMoney(payslip.netSalary ?? payslip.netPay)}</strong></div>
  </section>;
}

export default function Payslip({ payslips = [], canManagePayroll, onDownload, onView }) {
  return <section className="hr-panel">
    <HrPanelHeading title={canManagePayroll ? 'Generated payslips' : 'My payslips'}
      description="Monthly earnings, deductions and net salary statements." />
    {!payslips.length ? <div className="hr-empty"><strong>No payslips available</strong>
      <p>Payslips appear after a payroll run has been processed.</p></div> : <div className="hr-table-scroll">
      <table className="hr-table"><thead><tr>{['Payslip', 'Employee', 'Employee ID', 'Payroll month', 'Net salary', 'Generated', 'Actions'].map((label) =>
        <th key={label}>{label}</th>)}</tr></thead><tbody>
        {payslips.map((row) => <tr key={row.id || row.payslipNumber}>
          <td>{row.payslipNumber}</td><td>{row.employeeName || '—'}</td><td>{row.employeeCode || '—'}</td><td>{row.month || '—'}</td>
          <td>{formatMoney(row.netSalary ?? row.netPay)}</td><td>{row.generatedDate || '—'}</td>
          <td><div className="hr-row-actions"><button className="hr-text-button" onClick={() => onView(row)}>View</button>
            <button className="hr-icon-button" aria-label={`Download ${row.payslipNumber || 'payslip'}`}
              onClick={() => onDownload(row)}><ArrowDownToLine size={17} /></button></div></td>
        </tr>)}
      </tbody></table></div>}
  </section>;
}
