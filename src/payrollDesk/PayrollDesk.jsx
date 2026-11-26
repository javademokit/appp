import { useCallback, useEffect, useMemo, useState } from "react";
import { monthOptions } from "./utils";
import Dashboard from "./Dashboard.jsx";
import Attendance from "./Attendance.jsx";
import Payroll from "./Payroll.jsx";
import Structures from "./Structures.jsx";
import Employees from "./Employees.jsx";
import "./payrollDesk.css";

const TABS = [["dash", "Dashboard"], ["att", "Attendance"], ["run", "Payroll"], ["str", "Structures"], ["emp", "Employees"]];

export default function PayrollDesk({ initialTab = "dash" }) {
  const months = useMemo(monthOptions, []);
  const [tab, setTab] = useState(initialTab);
  const [month, setMonth] = useState(months[0].value);
  const [toast, setToast] = useState("");
  const notify = useCallback((m) => { setToast(m); setTimeout(() => setToast(""), 3200); }, []);
  const monthLabel = months.find((m) => m.value === month).label;

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  return (
    <div className="payroll-desk">
      <div className="wrap">
        <header>
          <div><h2>Payroll Desk</h2><div className="sub">Attendance, salary structures and monthly payroll</div></div>
          <div className="row" style={{ margin: 0 }}>
            <select aria-label="Pay period" value={month} onChange={(e) => setMonth(e.target.value)}>
              {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <nav aria-label="Payroll pages">{TABS.map(([k, l]) => <button key={k} type="button" className={tab === k ? "on" : ""} onClick={() => setTab(k)}>{l}</button>)}</nav>
          </div>
        </header>

        {tab === "dash" && <Dashboard month={month} notify={notify} />}
        {tab === "att" && <Attendance month={month} monthLabel={monthLabel} notify={notify} />}
        {tab === "run" && <Payroll month={month} monthLabel={monthLabel} notify={notify} />}
        {tab === "str" && <Structures notify={notify} />}
        {tab === "emp" && <Employees notify={notify} />}
        {toast && <div className="toast" role="status">{toast}</div>}
      </div>
    </div>
  );
}
