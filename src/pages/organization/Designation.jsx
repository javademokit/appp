import React from 'react';
import { Plus } from 'lucide-react';
import { HrDataTable, HrPanelHeading, HrStatusBadge, asArray } from '../hrUi';

export default function Designation({ designations = [], canManage, onAdd }) {
  return <section className="hr-panel">
    <HrPanelHeading title="Designations" description="Maintain role titles within each department."
      action={canManage && <button className="hr-icon-button" aria-label="Add designation" onClick={onAdd}><Plus size={18} /></button>} />
    <HrDataTable rows={asArray(designations)} columns={[
      { key: 'name', label: 'Designation' }, { key: 'code', label: 'Code' },
      { key: 'departmentName', label: 'Department', render: (row) => row.departmentName || row.departmentId || '—' },
      { key: 'status', label: 'Status', render: (row) => <HrStatusBadge value={row.status || (row.active ? 'ACTIVE' : 'INACTIVE')} /> },
    ]} />
  </section>;
}
