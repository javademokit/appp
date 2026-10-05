import React from 'react';
import { Plus } from 'lucide-react';
import { HrDataTable, HrPanelHeading, HrStatusBadge, asArray } from '../hrUi';

export default function Department({ departments = [], canManage, onAdd }) {
  return <section className="hr-panel">
    <HrPanelHeading title="Departments" description="Organize employees into clinical and operational teams."
      action={canManage && <button className="hr-icon-button" aria-label="Add department" onClick={onAdd}><Plus size={18} /></button>} />
    <HrDataTable rows={asArray(departments)} columns={[
      { key: 'name', label: 'Department' }, { key: 'code', label: 'Code' },
      { key: 'status', label: 'Status', render: (row) => <HrStatusBadge value={row.status || (row.active ? 'ACTIVE' : 'INACTIVE')} /> },
    ]} />
  </section>;
}
