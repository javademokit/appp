// ./DashBoard/AdminDashboard.js
import React from "react";
import { useState } from "react";
import HospitalOperationsBoard from "../components/HospitalOperationsBoard";
import UserAccessPage from "./UserAccessPage";
import PayrollRun from "../pages/payroll/PayrollRun";

const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState("dashboard");
  return (
    <main className="admin-dashboard">
      <nav className="workflow-tabs" aria-label="Administration pages">
        <button type="button" className={activeSection === "dashboard" ? "active" : ""}
          aria-current={activeSection === "dashboard" ? "page" : undefined}
          onClick={() => setActiveSection("dashboard")}>Operations dashboard</button>
        <button type="button" className={activeSection === "users" ? "active" : ""}
          aria-current={activeSection === "users" ? "page" : undefined}
          onClick={() => setActiveSection("users")}>User access &amp; roles</button>
        <button type="button" className={activeSection === "payroll" ? "active" : ""}
          aria-current={activeSection === "payroll" ? "page" : undefined}
          onClick={() => setActiveSection("payroll")}>HR &amp; Payroll</button>
      </nav>
      {activeSection === "users" ? <UserAccessPage />
        : activeSection === "payroll" ? <PayrollRun />
          : <HospitalOperationsBoard />}
    </main>
  );
};

export default AdminDashboard;
