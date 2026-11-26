// ./DashBoard/AdminDashboard.js
import React, { useEffect, useState } from "react";
import UserAccessPage from "./UserAccessPage";
import EmployeeOnboarding from "./EmployeeOnboarding";
import PayrollDesk from "../payrollDesk/PayrollDesk";
import { Banknote, BadgeIndianRupee, UserRoundPlus, UsersRound } from "lucide-react";
import Header from "../company/Header";
import Footer from "../company/Footer";
import "./AdminDashboard.css";

const getAdminSection = () => {
  const section = new URLSearchParams(window.location.search).get("section");
  return ["users", "employees", "payroll", "salary", "overtime-allowances"].includes(section)
    ? section === "overtime-allowances" ? "payroll" : section : "employees";
};
const AdminDashboard = () => {
  const [activeSection, setActiveSection] = useState(getAdminSection);

  useEffect(() => {
    const syncSection = () => setActiveSection(getAdminSection());
    window.addEventListener("popstate", syncSection);
    return () => window.removeEventListener("popstate", syncSection);
  }, []);

  const openSection = (section) => {
    setActiveSection(section);
    window.history.pushState({}, "", `/AdminDashboard?section=${section}`);
  };

  return (
    <div className="admin-page-shell">
      <Header />
      <main className={`admin-dashboard admin-section-${activeSection}`} aria-labelledby="admin-dashboard-title">
      <h1 id="admin-dashboard-title" className="admin-visually-hidden">Administration workspace</h1>
      <nav className="admin-navigation" aria-label="Administration pages">
        <button type="button" className={`admin-navigation-item ${activeSection === "users" ? "active" : ""}`}
          aria-current={activeSection === "users" ? "page" : undefined}
          onClick={() => openSection("users")}>
          <UsersRound size={19} />
          <span><strong>Users &amp; access</strong><small>Accounts and roles</small></span>
        </button>
        <button type="button" className={`admin-navigation-item ${activeSection === "employees" ? "active" : ""}`}
          aria-current={activeSection === "employees" ? "page" : undefined}
          onClick={() => openSection("employees")}>
          <UserRoundPlus size={19} />
          <span><strong>Employees</strong><small>Staff records and onboarding</small></span>
        </button>
        <button type="button" className={`admin-navigation-item ${activeSection === "payroll" ? "active" : ""}`}
          aria-current={activeSection === "payroll" ? "page" : undefined}
          onClick={() => openSection("payroll")}>
          <Banknote size={19} />
          <span><strong>HR &amp; payroll</strong><small>People and compensation</small></span>
        </button>
        <button type="button" className={`admin-navigation-item ${activeSection === "salary" ? "active" : ""}`}
          aria-current={activeSection === "salary" ? "page" : undefined}
          onClick={() => openSection("salary")}>
          <BadgeIndianRupee size={19} />
          <span><strong>Salary setup</strong><small>Components and structures</small></span>
        </button>
      </nav>
      <section className="admin-content" aria-live="polite">
        {activeSection === "users" ? <UserAccessPage />
          : activeSection === "employees" ? <EmployeeOnboarding />
          : activeSection === "payroll" ? <PayrollDesk initialTab="run" />
            : activeSection === "salary" ? <PayrollDesk initialTab="str" />
            : <PayrollDesk initialTab="emp" />}
      </section>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
