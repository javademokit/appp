import React from 'react';
import { Plus } from 'lucide-react';
import { HrDataTable, HrPanelHeading, HrStatusBadge, asArray, titleCase } from '../hrUi';

export default function SalaryComponent({ components = [], onAdd }) {
  return <section className="hr-panel">
    <HrPanelHeading title="Salary components" description="Configure earnings and deductions once for all staff."
      action={<button className="hr-button primary" onClick={onAdd}><Plus size={16} /> Add component</button>} />
    <HrDataTable rows={asArray(components)} emptyTitle="No components configured"
      emptyDetail="Add earnings and deductions before assigning salaries." columns={[
        { key: 'code', label: 'Code' }, { key: 'name', label: 'Component' },
        { key: 'type', label: 'Type', render: (row) => <HrStatusBadge value={row.type} /> },
        { key: 'calculationType', label: 'Calculation', render: (row) => titleCase(row.calculationType) },
        { key: 'value', label: 'Value', render: (row) => row.calculationType === 'PERCENTAGE' ? `${row.value}%` : row.value },
      ]} />
  </section>;
}
