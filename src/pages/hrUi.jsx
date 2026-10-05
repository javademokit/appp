import React from 'react';
import { FileText } from 'lucide-react';

export const asArray = (value) => Array.isArray(value) ? value : [];
export const titleCase = (value) => String(value || '').replaceAll('_', ' ').toLowerCase()
  .replace(/\b\w/g, (letter) => letter.toUpperCase());
export const formatMoney = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(value) || 0);

export function HrPanelHeading({ title, description, action }) {
  return <div className="hr-panel-heading"><div><h2>{title}</h2><p>{description}</p></div>{action}</div>;
}

export function HrStatusBadge({ value }) {
  const status = String(value || 'UNKNOWN').toLowerCase().replaceAll('_', '-');
  return <span className={`hr-status hr-status-${status}`}>{titleCase(value || 'Unknown')}</span>;
}

export function HrDataTable({ columns, rows, emptyTitle = 'Nothing to show yet', emptyDetail = 'Add a record to get started.' }) {
  if (!rows.length) return <div className="hr-empty"><span><FileText size={19} /></span><strong>{emptyTitle}</strong><p>{emptyDetail}</p></div>;
  return <div className="hr-table-scroll"><table className="hr-table">
    <thead><tr>{columns.map(({ key, label }) => <th key={key}>{label}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={row.id || row.employeeId || row.code || index}>
      {columns.map((column) => <td key={column.key}>{column.render ? column.render(row)
        : row[column.key] === undefined || row[column.key] === null || row[column.key] === ''
          ? '—' : row[column.key]}</td>)}
    </tr>)}</tbody>
  </table></div>;
}

export function HrField({ label, children, required = false, className = '' }) {
  return <label className={`hr-field ${className}`}><span>{label}{required && <b aria-hidden="true"> *</b>}</span>{children}</label>;
}
