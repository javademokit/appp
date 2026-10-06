// ./DashBoard/AdminDashboard.js
import React from "react";
import { useState } from "react";
import HospitalOperationsBoard from "../components/HospitalOperationsBoard";
import UserAccessPage from "./UserAccessPage";
import PayrollRun from "../pages/payroll/PayrollRun";
import { Activity, Banknote, ShieldCheck, UsersRound } from "lucide-react";
import "./AdminDashboard.css";

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  return (
    <main className="admin-dashboard" aria-labelledby="admin-dashboard-title">
      <header className="admin-hero">
        <div className="admin-hero-copy">
          <span className="admin-eyebrow"><ShieldCheck size={15} /> Administration workspace</span>
          <h1 id="admin-dashboard-title">Hospital control center</h1>
          <p>Monitor hospital operations and manage the people and resources behind your care teams.</p>
        </div>
        <div className="admin-hero-mark" aria-hidden="true"><Activity size={28} /></div>
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
        <button type="button" className={`admin-navigation-item ${activeSection === "payroll" ? "active" : ""}`}
          aria-current={activeSection === "payroll" ? "page" : undefined}
          onClick={() => setActiveSection("payroll")}>
          <Banknote size={19} />
          <span><strong>HR &amp; payroll</strong><small>People and compensation</small></span>
        </button>
      </nav>
      <section className="admin-content" aria-live="polite">
        {activeSection === "users" ? <UserAccessPage />
          : activeSection === "payroll" ? <PayrollRun />
            : <HospitalOperationsBoard />}
      </section>
    </main>
  );
};

export default AdminDashboard;
