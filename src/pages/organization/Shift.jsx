import React from 'react';
import { Plus } from 'lucide-react';
import { HrDataTable, HrPanelHeading, HrStatusBadge, asArray } from '../hrUi';

export default function Shift({ shifts = [], canManage, onAdd }) {
  return <section className="hr-panel">
    <HrPanelHeading title="Shifts" description="Define schedules and breaks for staffing coverage."
      action={canManage && <button className="hr-icon-button" aria-label="Add shift" onClick={onAdd}><Plus size={18} /></button>} />
    <HrDataTable rows={asArray(shifts)} columns={[
      { key: 'name', label: 'Shift' }, { key: 'startTime', label: 'Start' }, { key: 'endTime', label: 'End' },
      { key: 'breakMinutes', label: 'Break (min)' },
      { key: 'status', label: 'Status', render: (row) => <HrStatusBadge value={row.status || (row.active ? 'ACTIVE' : 'INACTIVE')} /> },
    ]} />
  </section>;
}
