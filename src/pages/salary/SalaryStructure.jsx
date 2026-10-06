import React from 'react';
import { Plus } from 'lucide-react';
import { HrDataTable, HrPanelHeading, asArray, formatMoney } from '../hrUi';

export default function SalaryStructure({ structures = [], onAssign }) {
  return <section className="hr-panel">
    <HrPanelHeading title="Salary structures" description="Assign each employee their own effective-dated earning and deduction amounts, including PF."
      action={<button className="hr-button primary" onClick={onAssign}><Plus size={16} /> Assign structure</button>} />
    <HrDataTable rows={asArray(structures)} columns={[
      { key: 'employeeName', label: 'Employee' }, { key: 'employeeCode', label: 'Employee ID' },
      { key: 'effectiveFrom', label: 'Effective from' }, { key: 'effectiveTo', label: 'Effective to' },
      { key: 'grossSalary', label: 'Gross salary', render: (row) => formatMoney(row.grossSalary ?? row.totalGross) },
      { key: 'status', label: 'Status' },
    ]} />
  </section>;
}
