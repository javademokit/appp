import { useEffect, useState } from "react";
import { api } from "./payrollApi";
import { inr } from "./utils";

export default function Dashboard({ month, notify }) {
  const [d, setD] = useState(null);
  useEffect(() => {
    setD(null);
    api.payroll(month).then(setD).catch((e) => notify(e.message));
  }, [month, notify]);

  if (!d) return <div className="sub">Loading…</div>;
  const byDept = {};
  d.rows.forEach((r) => { byDept[r.department] = (byDept[r.department] || 0) + Number(r.net); });
  const max = Math.max(...Object.values(byDept), 1);

  return (
    <>
      <div className="grid">
        <div className="card"><div className="k">Employees</div><div className="v">{d.rows.length}</div></div>
        <div className="card"><div className="k">Gross pay</div><div className="v">{inr(d.gross)}</div></div>
        <div className="card"><div className="k">Deductions</div><div className="v">{inr(d.deductions)}</div></div>
        <div className="card">
          <div className="k">Net payout</div><div className="v">{inr(d.net)}</div>
          <span className={"pill " + (d.processed ? "ok" : "pend")}>{d.processed ? "Processed" : "Not processed yet"}</span>
        </div>
      </div>
      <div className="card sec">
        <h2>Net pay by department</h2>
        {Object.entries(byDept).sort((a, b) => b[1] - a[1]).map(([name, v]) => (
          <div className="bar" key={name}>
            <span>{name}</span>
            <div className="track"><div className="fill" style={{ width: (v / max) * 100 + "%" }} /></div>
            <span style={{ textAlign: "right" }}>{inr(v)}</span>
          </div>
        ))}
      </div>
    </>
  );
}
