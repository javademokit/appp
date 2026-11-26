import { useCallback, useEffect, useState } from "react";
import { api } from "./payrollApi";
import { CODE_TO_STATUS, NAMES, NEXT } from "./utils";

export default function Attendance({ month, monthLabel, notify }) {
  const [d, setD] = useState(null);
  const [q, setQ] = useState("");
  const load = useCallback(() => api.attendance(month).then(setD).catch((e) => notify(e.message)), [month, notify]);
  useEffect(() => { setD(null); load(); }, [load]);

  const click = async (emp, i) => {
    const next = NEXT[emp.days[i]];
    if (d.processed || !next) return;
    setD((p) => ({
      ...p,
      employees: p.employees.map((x) =>
        x.employeeId === emp.employeeId ? { ...x, days: x.days.map((c, j) => (j === i ? next : c)) } : x),
    }));
    try {
      await api.setAttendance({
        employeeId: emp.employeeId,
        date: `${month}-${String(i + 1).padStart(2, "0")}`,
        status: CODE_TO_STATUS[next],
      });
    } catch (e) { notify(e.message); load(); }
  };

  if (!d) return <div className="sub">Loading…</div>;
  const shown = d.employees.filter((e) =>
    [e.code, e.name, e.department, e.role].filter(Boolean).join(" ").toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h2 style={{ margin: 0 }}>Attendance, {monthLabel}</h2>
        <input type="search" aria-label="Search attendance employees" placeholder="Search name, ID, department or role" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="sub" style={{ marginBottom: 10 }}>
        {d.processed
          ? `${shown.length} of ${d.employees.length} employees shown. This month is processed, so attendance is locked.`
          : `${shown.length} of ${d.employees.length} employees shown. Click a weekday to cycle Present, Absent, Half day and Paid leave. Unmarked weekdays default to present.`}
      </div>
      <div className="leg">{Object.entries(NAMES).map(([c, n]) => <span key={c}><b className={"c" + c}>{c}</b>{n}</span>)}</div>
      <div className="tw">
        <table className="att">
          <thead><tr><th>Employee</th>{Array.from({ length: d.daysInMonth }, (_, i) => <th key={i}>{i + 1}</th>)}</tr></thead>
          <tbody>
            {shown.map((e) => (
              <tr key={e.employeeId}>
                <td>
                  <div>{e.name}</div>
                  <div className="att-meta">{[e.code, e.role, e.department].filter(Boolean).join(" · ")}</div>
                </td>
                {e.days.map((c, i) => (
                  <td key={i}>
                    <button type="button" className={"cell c" + c} disabled={d.processed || c === "W"} title={NAMES[c]}
                      aria-label={`${e.name} day ${i + 1}: ${NAMES[c]}`} onClick={() => click(e, i)}>{c}</button>
                  </td>
                ))}
              </tr>
            ))}
            {!shown.length && <tr><td colSpan={d.daysInMonth + 1}>No employees match your search.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
