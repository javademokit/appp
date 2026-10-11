import React, { useEffect, useMemo, useState } from 'react';
import { Check, Pencil, Plus, Search, X } from 'lucide-react';
import { request, jsonOptions } from '../services/hrRequest';
import './SettingsPage.css';

const normalizeDepartments = (items = []) => (Array.isArray(items) ? items : []).map((item, index) => ({
  id: item.id || item._id || `${item.name || 'department'}-${index}`,
  name: item.name || item.departmentName || 'Unnamed department',
  code: item.code || item.departmentCode || '-',
  status: String(item.status || (item.active === false ? 'INACTIVE' : 'ACTIVE')).toUpperCase(),
}));

const normalizeDesignations = (items = []) => (Array.isArray(items) ? items : []).map((item, index) => ({
  id: item.id || item._id || `${item.name || 'designation'}-${index}`,
  name: item.name || item.designationName || 'Unnamed role',
  code: item.code || item.designationCode || '-',
  departmentId: item.departmentId || '',
  departmentName: item.departmentName || item.department || '',
  status: String(item.status || (item.active === false ? 'INACTIVE' : 'ACTIVE')).toUpperCase(),
}));

const emptyForm = { name: '', code: '', departmentId: '' };

export default function SettingsPage() {
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [activeTab, setActiveTab] = useState('departments');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [dialog, setDialog] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const loadSettings = async () => {
    try {
      setLoading(true);
      const [departmentData, designationData] = await Promise.all([
        request('/departments'),
        request('/designations'),
      ]);
      setDepartments(normalizeDepartments(departmentData));
      setRoles(normalizeDesignations(designationData));
    } catch (error) {
      console.error('Failed to load settings data', error);
      setDepartments([]);
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadSettings();
  }, []);

  const isDepartmentTab = activeTab === 'departments';
  const activeDepartments = useMemo(() => departments.filter((item) => item.status === 'ACTIVE'), [departments]);
  const visibleRows = useMemo(() => {
    const rows = isDepartmentTab ? departments : roles;
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesQuery = !query || `${row.name} ${row.code} ${row.departmentName || ''}`.toLowerCase().includes(query);
      const matchesStatus = !statusFilter || row.status === statusFilter;
      const matchesDepartment = isDepartmentTab || !departmentFilter || row.departmentId === departmentFilter;
      return matchesQuery && matchesStatus && matchesDepartment;
    });
  }, [departments, roles, isDepartmentTab, search, statusFilter, departmentFilter]);

  const openDialog = (kind, record = null) => {
    setForm(record ? {
      name: record.name,
      code: record.code === '-' ? '' : record.code,
      departmentId: record.departmentId || '',
    } : {
      ...emptyForm,
      departmentId: activeDepartments[0]?.id || '',
    });
    setFormError('');
    setDialog({ kind, record });
  };

  const closeDialog = () => {
    if (saving) return;
    setDialog(null);
    setFormError('');
  };

  const saveRecord = async () => {
    const name = form.name.trim();
    const code = form.code.trim().toUpperCase().replace(/\s+/g, '');
    if (!name) {
      setFormError('Enter a name.');
      return;
    }
    if (!code) {
      setFormError('Enter a code.');
      return;
    }
    if (dialog.kind === 'designation' && !form.departmentId) {
      setFormError('Choose a department first.');
      return;
    }

    const endpoint = dialog.kind === 'department' ? '/departments' : '/designations';
    const payload = {
      name,
      code,
      status: dialog.record?.status || 'ACTIVE',
      ...(dialog.kind === 'designation' ? { departmentId: form.departmentId } : {}),
    };

    try {
      setSaving(true);
      const suffix = dialog.record ? `/${encodeURIComponent(dialog.record.id)}` : '';
      await request(`${endpoint}${suffix}`, jsonOptions(dialog.record ? 'PUT' : 'POST', payload));
      setDialog(null);
      setNotice(`${dialog.kind === 'department' ? 'Department' : 'Designation'} saved.`);
      await loadSettings();
    } catch (error) {
      setFormError(error.message || 'Could not save this record.');
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (record) => {
    const kind = isDepartmentTab ? 'department' : 'designation';
    const endpoint = isDepartmentTab ? '/departments' : '/designations';
    try {
      if (record.status === 'ACTIVE') {
        await request(`${endpoint}/${encodeURIComponent(record.id)}`, { method: 'DELETE' });
      } else {
        await request(`${endpoint}/${encodeURIComponent(record.id)}`, jsonOptions('PUT', {
          name: record.name,
          code: record.code,
          status: 'ACTIVE',
          ...(!isDepartmentTab ? { departmentId: record.departmentId } : {}),
        }));
      }
      setNotice(`${kind === 'department' ? 'Department' : 'Designation'} ${record.status === 'ACTIVE' ? 'deactivated' : 'activated'}.`);
      await loadSettings();
    } catch (error) {
      setNotice(error.message || `Could not update ${kind} status.`);
    }
  };

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  const designationCodePlaceholder = () => {
    const department = departments.find((item) => item.id === form.departmentId);
    const prefix = String(department?.code || 'ROLE').replace(/[^a-zA-Z0-9]/g, '').slice(0, 3).toUpperCase();
    const suffix = form.name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase();
    return suffix ? `${prefix}-${suffix}` : 'e.g. OPD-DOCTOR';
  };

  return (
    <main className="employee-setup">
      <header className="employee-setup-heading">
        <div>
          <h1>Employee setup</h1>
          <p>Define departments and designations once. Employee profiles select from these lists.</p>
        </div>
      </header>

      <div className="employee-setup-tabs" role="tablist" aria-label="Employee setup lists">
        <button type="button" role="tab" aria-selected={isDepartmentTab} onClick={() => { setActiveTab('departments'); setDepartmentFilter(''); setSearch(''); setStatusFilter(''); }}>
          Departments <span>{departments.length}</span>
        </button>
        <button type="button" role="tab" aria-selected={!isDepartmentTab} onClick={() => { setActiveTab('designations'); setDepartmentFilter(''); setSearch(''); setStatusFilter(''); }}>
          Designations <span>{roles.length}</span>
        </button>
      </div>

      <section className="employee-setup-panel" aria-label={isDepartmentTab ? 'Departments' : 'Designations'}>
        <div className="employee-setup-toolbar">
          <div className="employee-setup-section-title">
            <h2>{isDepartmentTab ? 'Departments' : 'Designations'}</h2>
            <p>{isDepartmentTab ? 'Where employees work in the organization.' : 'Job titles, each linked to a department.'}</p>
          </div>
          <label className="employee-setup-search">
            <Search size={17} aria-hidden="true" />
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" aria-label="Search records" />
          </label>
          {!isDepartmentTab && (
            <select value={departmentFilter} onChange={(event) => setDepartmentFilter(event.target.value)} aria-label="Filter by department">
              <option value="">All departments</option>
              {departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}
            </select>
          )}
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="Filter by status">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
          <button type="button" className="employee-setup-primary" onClick={() => openDialog(isDepartmentTab ? 'department' : 'designation')}>
            <Plus size={17} /> Add {isDepartmentTab ? 'department' : 'designation'}
          </button>
        </div>

        {loading ? <div className="employee-setup-empty">Loading {isDepartmentTab ? 'departments' : 'designations'}…</div> : visibleRows.length ? (
          <div className="employee-setup-table-wrap">
            <table className="employee-setup-table">
              <thead>
                {isDepartmentTab ? (
                  <tr><th>Department</th><th>Code</th><th>Designations</th><th>Status</th><th aria-label="Actions" /></tr>
                ) : (
                  <tr><th>Designation</th><th>Department</th><th>Code</th><th>Status</th><th aria-label="Actions" /></tr>
                )}
              </thead>
              <tbody>
                {visibleRows.map((row) => (
                  <tr key={row.id}>
                    {isDepartmentTab ? <>
                      <td className="employee-setup-name">{row.name}</td>
                      <td><span className="employee-setup-code">{row.code}</span></td>
                      <td className="employee-setup-muted">{roles.filter((role) => role.departmentId === row.id).length}</td>
                    </> : <>
                      <td className="employee-setup-name">{row.name}</td>
                      <td>{row.departmentName || departments.find((item) => item.id === row.departmentId)?.name || '—'}</td>
                      <td><span className="employee-setup-code">{row.code}</span></td>
                    </>}
                    <td><span className={`employee-setup-status ${row.status === 'ACTIVE' ? 'is-active' : 'is-inactive'}`}>{row.status === 'ACTIVE' ? 'Active' : 'Inactive'}</span></td>
                    <td>
                      <div className="employee-setup-actions">
                        <button type="button" className="employee-setup-edit" onClick={() => openDialog(isDepartmentTab ? 'department' : 'designation', row)} aria-label={`Edit ${row.name}`} title="Edit">
                          <Pencil size={15} /> <span>Edit</span>
                        </button>
                        <label className="employee-setup-switch" title={row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}>
                          <input type="checkbox" checked={row.status === 'ACTIVE'} onChange={() => toggleStatus(row)} aria-label={`${row.status === 'ACTIVE' ? 'Deactivate' : 'Activate'} ${row.name}`} />
                          <span />
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="employee-setup-empty">{search || statusFilter || departmentFilter ? 'Nothing matches. Clear the filters or search again.' : `No ${isDepartmentTab ? 'departments' : 'designations'} yet. Add one to get started.`}</div>
        )}
      </section>

      {dialog && (
        <div className="employee-setup-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) closeDialog(); }}>
          <section className="employee-setup-dialog" role="dialog" aria-modal="true" aria-labelledby="employee-setup-dialog-title">
            <div className="employee-setup-dialog-heading">
              <div>
                <h2 id="employee-setup-dialog-title">{dialog.record ? 'Edit' : 'Add'} {dialog.kind}</h2>
                <p>{dialog.kind === 'department' ? 'Enter the department name and unique code.' : 'Choose a department, then enter the designation and its unique code.'}</p>
              </div>
              <button type="button" className="employee-setup-close" onClick={closeDialog} aria-label="Close dialog"><X size={19} /></button>
            </div>
            <div className="employee-setup-form">
              {dialog.kind === 'designation' && (
                <label>
                  <span>Department</span>
                  <select value={form.departmentId} onChange={(event) => setForm((current) => ({ ...current, departmentId: event.target.value }))}>
                    <option value="">Choose a department</option>
                    {departments.filter((item) => item.status === 'ACTIVE' || item.id === form.departmentId).map((department) => (
                      <option key={department.id} value={department.id}>{department.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                <span>{dialog.kind === 'department' ? 'Department name' : 'Designation name'}</span>
                <input autoFocus value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder={dialog.kind === 'department' ? 'Out-patient' : 'Nurse'} />
              </label>
              <label>
                <span>{dialog.kind === 'department' ? 'Department code' : 'Designation code'}</span>
                <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder={dialog.kind === 'department' ? 'OPD' : designationCodePlaceholder()} />
                <small>{dialog.kind === 'department' ? 'Short, uppercase and unique, such as OPD.' : 'Required by the directory and must be unique.'}</small>
              </label>
              {formError && <p className="employee-setup-error" role="alert">{formError}</p>}
            </div>
            <div className="employee-setup-dialog-actions">
              <button type="button" className="employee-setup-secondary" onClick={closeDialog} disabled={saving}>Cancel</button>
              <button type="button" className="employee-setup-primary" onClick={saveRecord} disabled={saving}>
                <Check size={16} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </section>
        </div>
      )}

      {notice && <div className="employee-setup-toast" role="status">{notice}</div>}
    </main>
  );
}
