import { useCallback, useEffect, useState } from "react";
import { api } from "./payrollApi";

function EmployeeRow({ e, structures, onSave }) {
  const [gross, setGross] = useState(e.monthlyGross);
  useEffect(() => setGross(e.monthlyGross), [e.monthlyGross]);
  return (
    <tr>
      <td>{e.code}</td><td>{e.name}</td><td>{e.role}</td>
      <td className="n">
        <input type="number" min="0" step="1000" style={{ width: 110, textAlign: "right" }} value={gross}
          aria-label={"Monthly gross for " + e.name}
          onChange={(ev) => setGross(Number(ev.target.value))}
          onBlur={() => gross !== e.monthlyGross && onSave({ ...e, monthlyGross: gross })} />
      </td>
      <td>
        <select value={e.structureId} aria-label={"Structure for " + e.name}
          onChange={(ev) => onSave({ ...e, structureId: Number(ev.target.value) })}>
          {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </td>
    </tr>
  );
}

export default function Employees({ notify }) {
  const [emps, setEmps] = useState([]);
  const [structures, setStructures] = useState([]);
  const [roles, setRoles] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ name: "", department: "", role: "", monthlyGross: "", structureId: "", bank: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const [e, s, r] = await Promise.all([api.employees(), api.structures(), api.employeeRoles()]);
      setEmps(e);
      setStructures(s);
      setRoles(r);
      setForm((f) => ({ ...f, structureId: f.structureId || s[0]?.id || "" }));
    } catch (e) {
      setLoadError(e.message);
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { load().catch((e) => notify(e.message)); }, [load, notify]);

  const save = async (emp) => {
    try { await api.saveEmployee(emp); notify("Saved " + emp.name); await load(); }
    catch (e) { notify(e.message); }
  };
  const add = async () => {
    try {
      await api.saveEmployee({ ...form, monthlyGross: Number(form.monthlyGross), structureId: Number(form.structureId) });
      setForm({ name: "", department: "", role: "", monthlyGross: "", structureId: structures[0]?.id || "", bank: "" });
      notify("Employee added");
      await load();
    } catch (e) { notify(e.message); }
  };

  const shown = emps.filter((e) => (e.name + e.department + e.role + e.code).toLowerCase().includes(q.toLowerCase()));
  const set = (k) => (ev) => setForm((f) => ({ ...f, [k]: ev.target.value }));
  const grossValid = form.monthlyGross !== "" && Number.isFinite(Number(form.monthlyGross)) && Number(form.monthlyGross) >= 0;
  const canAdd = Boolean(form.name.trim() && form.department.trim() && form.role.trim()
    && grossValid && form.structureId);

  return (
    <>
      <div className="card">
        <div className="row"><input type="search" placeholder="Search name, department or role" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search employees" /></div>
        <div className="tw">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Role</th><th className="n">Monthly gross (₹)</th><th>Salary structure</th></tr></thead>
            <tbody>
              {loading && <tr><td colSpan="5">Loading employees…</td></tr>}
              {!loading && loadError && <tr><td colSpan="5">Could not load employee records: {loadError}</td></tr>}
              {!loading && !loadError && shown.map((e) => <EmployeeRow key={e.id} e={e} structures={structures} onSave={save} />)}
              {!loading && !loadError && !shown.length && <tr><td colSpan="5">No employees match your search.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="sub" style={{ marginTop: 10 }}>Changes apply to months not yet processed. Processed months keep their saved figures.</div>
      </div>

      <div className="card sec">
        <h2>Add employee</h2>
        <div className="row">
          <input placeholder="Name" aria-label="Employee name" value={form.name} onChange={set("name")} />
          <input placeholder="Department (Nursing, HR, Lab, IT…)" aria-label="Department" value={form.department} onChange={set("department")} />
          <input placeholder="Job title / role" aria-label="Role" list="employee-role-options" value={form.role} onChange={set("role")} />
          <datalist id="employee-role-options">{roles.map((role) => <option key={role} value={role} />)}</datalist>
          <input type="number" min="0" placeholder="Monthly gross ₹" aria-label="Monthly gross" value={form.monthlyGross} onChange={set("monthlyGross")} style={{ width: 150 }} />
          <select value={form.structureId} onChange={set("structureId")} aria-label="Salary structure">
            <option value="">Select salary structure</option>
            {structures.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          <input placeholder="Bank / payment reference (optional)" aria-label="Bank or payment reference" value={form.bank} onChange={set("bank")} />
          <button type="button" className="btn" disabled={!canAdd} onClick={add}>Add</button>
        </div>
        {structures.length === 0 && !loading && <div className="sub">Create a salary structure before adding employees.</div>}
        <div className="sub">Role suggestions come from payroll setup; you can also enter a custom role.</div>
      </div>
    </>
  );
}
