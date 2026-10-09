import React from 'react';
import { Plus } from 'lucide-react';
import { HrDataTable, HrPanelHeading, asArray, formatMoney } from '../hrUi';

export default function SalaryStructure({ structures = [], components = [], onAssign }) {
  const componentsById = new Map(asArray(components).map((component) => [component.id, component]));
  const grossForStructure = (structure) => structure.grossSalary ?? structure.totalGross
    ?? asArray(structure.components).reduce((total, line) => {
      const component = componentsById.get(line.componentId);
      if (String(component?.type || '').toUpperCase() !== 'EARNING') return total;
      const amount = Number(line.amount ?? 0);
      const units = Number(line.units ?? 1);
      return total + (Number.isFinite(amount) ? amount : 0) * (Number.isFinite(units) ? units : 1);
    }, 0);

  return <section className="hr-panel">
    <HrPanelHeading title="Salary structures" description="Assign each employee their own effective-dated earning and deduction amounts, including PF."
      action={<button className="hr-button primary" onClick={onAssign}><Plus size={16} /> Assign structure</button>} />
    <HrDataTable rows={asArray(structures)} columns={[
      { key: 'employeeName', label: 'Employee' }, { key: 'employeeCode', label: 'Employee ID' },
      { key: 'effectiveFrom', label: 'Effective from' }, { key: 'effectiveTo', label: 'Effective to' },
      { key: 'grossSalary', label: 'Gross salary', render: (row) => formatMoney(grossForStructure(row)) },
      { key: 'status', label: 'Status' },
    ]} />
  </section>;
}
