// ./DashBoard/AdminDashboard.js
import React from "react";
import { useState } from "react";
import HospitalOperationsBoard from "../components/HospitalOperationsBoard";
import UserAccessPage from "./UserAccessPage";
import PayrollRun from "../pages/payroll/PayrollRun";
import { Activity, Banknote, BadgeIndianRupee, ShieldCheck, UserRoundPlus, UsersRound } from "lucide-react";
import BrandLogo from "../components/BrandLogo";
import "./AdminDashboard.css";

const getAdminSection = () => {
  const section = new URLSearchParams(window.location.search).get("section");
  return ["users", "employees", "payroll", "salary", "overtime-allowances"].includes(section)
    ? section === "overtime-allowances" ? "payroll" : section : "dashboard";
};
const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState(getAdminSection);
  const salaryView = new URLSearchParams(window.location.search).get("salaryView") === "structures"
    ? "structures" : "components";
  const payrollView = new URLSearchParams(window.location.search).get("payrollView") === "overtime"
    || new URLSearchParams(window.location.search).get("section") === "overtime-allowances"
    ? "overtime" : "payroll";

  return (
    <main className="admin-dashboard" aria-labelledby="admin-dashboard-title">
      <header className="admin-hero">
        <div className="admin-hero-copy">
          <span className="admin-eyebrow"><ShieldCheck size={15} /> Administration workspace</span>
          <h1 id="admin-dashboard-title">Hospital control center</h1>
          <p>Monitor hospital operations and manage the people and resources behind your care teams.</p>
        </div>
        <div className="admin-hero-mark"><BrandLogo className="brand-logo-panel" /></div>
      </header>

      <nav className="admin-navigation" aria-label="Administration pages">
        <button type="button" className={`admin-navigation-item ${activeSection === "dashboard" ? "active" : ""}`}
          aria-current={activeSection === "dashboard" ? "page" : undefined}
          onClick={() => setActiveSection("dashboard")}>
          <Activity size={19} />
          <span><strong>Operations</strong><small>Hospital overview</small></span>
        </button>
        <button type="button" className={`admin-navigation-item ${activeSection === "users" ? "active" : ""}`}
          aria-current={activeSection === "users" ? "page" : undefined}
          onClick={() => setActiveSection("users")}>
          <UsersRound size={19} />
          <span><strong>Users &amp; access</strong><small>Accounts and roles</small></span>
        </button>
        <button type="button" className={`admin-navigation-item ${activeSection === "employees" ? "active" : ""}`}
          aria-current={activeSection === "employees" ? "page" : undefined}
          onClick={() => setActiveSection("employees")}>
          <UserRoundPlus size={19} />
          <span><strong>Employees</strong><small>Staff records and onboarding</small></span>
        </button>
        <button type="button" className={`admin-navigation-item ${activeSection === "payroll" ? "active" : ""}`}
          aria-current={activeSection === "payroll" ? "page" : undefined}
          onClick={() => setActiveSection("payroll")}>
          <Banknote size={19} />
          <span><strong>HR &amp; payroll</strong><small>People and compensation</small></span>
        </button>
        <button type="button" className={`admin-navigation-item ${activeSection === "salary" ? "active" : ""}`}
          aria-current={activeSection === "salary" ? "page" : undefined}
          onClick={() => setActiveSection("salary")}>
          <BadgeIndianRupee size={19} />
          <span><strong>Salary setup</strong><small>Components and structures</small></span>
        </button>
      </nav>
      <section className="admin-content" aria-live="polite">
        {activeSection === "users" ? <UserAccessPage />
          : activeSection === "employees" ? <PayrollRun hideHeader employeesOnly />
          : activeSection === "payroll" ? <PayrollRun hideHeader payrollOnly initialPayrollView={payrollView} />
            : activeSection === "salary" ? <PayrollRun hideHeader salaryOnly initialSalaryView={salaryView} />
            : <HospitalOperationsBoard />}
      </section>
    </main>
  );
};

export default AdminDashboard;
