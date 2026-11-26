import { useCallback, useEffect, useState } from "react";
import { api } from "./payrollApi";
import { inr } from "./utils";
import Payslip from "./Payslip.jsx";

export default function Payroll({ month, monthLabel, notify }) {
  const [d, setD] = useState(null);
  const [runs, setRuns] = useState([]);
  const [auto, setAuto] = useState(null);
  const [slip, setSlip] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.payroll(month).then(setD).catch((e) => notify(e.message));
    api.runs().then(setRuns).catch((e) => notify(e.message));
  }, [month, notify]);
  useEffect(() => { setD(null); load(); }, [load]);
  useEffect(() => {
    let active = true;
    api.autoRun().then((r) => {
      if (active) setAuto(r.enabled);
    }).catch((e) => notify(e.message));
    return () => { active = false; };
  }, [notify]);

  const run = async () => {
    setBusy(true);
    try { await api.runPayroll(month); notify("Payroll processed for " + monthLabel); load(); }
    catch (e) { notify(e.message); }
    finally { setBusy(false); }
  };
  const toggleAuto = async (enabled) => {
    setAuto(enabled);
    try { await api.setAutoRun(enabled); } catch (e) { notify(e.message); setAuto(!enabled); }
  };

  if (!d) return <div className="sub">Loading…</div>;
  return (
    <>
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div>
            <h2 style={{ margin: 0 }}>{monthLabel}</h2>
            <div className="sub">Each person is paid by their own salary structure, prorated by paid days. Absent days are unpaid; half days count as 0.5.</div>
          </div>
          <button type="button" className="btn" disabled={d.processed || busy} onClick={run}>{d.processed ? "Payroll processed" : "Run now"}</button>
        </div>
        <div className="tw">
          <table>
            <thead><tr><th>Employee</th><th>Structure</th><th className="n">Monthly gross</th><th className="n">Paid days</th><th className="n">Earned gross</th><th className="n">Deductions</th><th className="n">Net pay</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.employeeId}>
                  <td>{r.name}</td><td>{r.structureName}</td>
                  <td className="n">{inr(r.monthlyGross)}</td><td className="n">{r.paidDays}/{r.totalDays}</td>
                  <td className="n">{inr(r.gross)}</td><td className="n">{inr(r.totalDeductions)}</td>
                  <td className="n"><b>{inr(r.net)}</b></td>
                  <td><span className={"pill " + (d.processed ? "ok" : "pend")}>{d.processed ? "Paid" : "Pending"}</span></td>
                  <td><button type="button" className="btn ghost sm" onClick={() => setSlip(r)}>Payslip</button></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr><td><b>Total</b></td><td colSpan="3"></td><td className="n"><b>{inr(d.gross)}</b></td><td className="n"><b>{inr(d.deductions)}</b></td><td className="n"><b>{inr(d.net)}</b></td><td colSpan="2"></td></tr>
            </tfoot>
          </table>
        </div>
      </div>

      <div className="card sec">
        <h2>Monthly auto-run</h2>
        <label className="sw">
          <input type="checkbox" checked={auto === true} disabled={auto === null} onChange={(e) => toggleAuto(e.target.checked)} />
          Run payroll automatically at 6:00 pm on the last day of every month
        </label>
        <div className="sub" style={{ margin: "8px 0 12px" }}>
          The server schedules this itself (see PayrollScheduler). It uses the attendance marked by then and locks the month.
        </div>
        <div className="hd">Run history</div>
        {runs.length === 0 && <div className="sub">No payroll has been processed yet.</div>}
        {runs.map((r) => (
          <div className="ps" key={r.month}>
            <span>{r.month} · {r.mode}</span>
            <span>{new Date(r.runAt).toLocaleString("en-IN")} · {inr(r.net)}</span>
          </div>
        ))}
      </div>
      {slip && <Payslip row={slip} monthLabel={monthLabel} runAt={d.runAt} onClose={() => setSlip(null)} />}
    </>
  );
}
