// ./DashBoard/AdminDashboard.js
import React, { useEffect, useState } from "react";
import UserAccessPage from "./UserAccessPage";
import PayrollRun from "../pages/payroll/PayrollRun";
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
  const [salaryView, setSalaryView] = useState(() => (
    new URLSearchParams(window.location.search).get("salaryView") === "structures" ? "structures" : "components"
  ));
  const [payrollView, setPayrollView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const requested = params.get("payrollView");
    if (requested === "overtime" || params.get("section") === "overtime-allowances") return "overtime";
    if (requested === "history") return "history";
    if (requested === "approval") return "approval";
    return "payroll";
  });

  useEffect(() => {
    const syncSection = () => {
      const params = new URLSearchParams(window.location.search);
      setActiveSection(getAdminSection());
      setSalaryView(params.get("salaryView") === "structures" ? "structures" : "components");
      const requested = params.get("payrollView");
      setPayrollView(requested === "overtime" || params.get("section") === "overtime-allowances"
        ? "overtime"
        : requested === "history" ? "history"
          : requested === "approval" ? "approval" : "payroll");
    };
    window.addEventListener("popstate", syncSection);
    return () => window.removeEventListener("popstate", syncSection);
  }, []);

  const openSection = (section, extraQuery = "") => {
    setActiveSection(section);
    if (section === "salary") setSalaryView(extraQuery.includes("structures") ? "structures" : "components");
    if (section === "payroll") setPayrollView(extraQuery.includes("overtime") ? "overtime"
      : extraQuery.includes("history") ? "history"
        : extraQuery.includes("approval") ? "approval" : "payroll");
    window.history.pushState({}, "", `/AdminDashboard?section=${section}${extraQuery}`);
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
          : activeSection === "employees" ? <PayrollRun hideHeader employeesOnly />
          : activeSection === "payroll" ? <PayrollRun hideHeader payrollOnly initialPayrollView={payrollView} />
            : activeSection === "salary" ? <PayrollRun hideHeader salaryOnly initialSalaryView={salaryView} />
            : <PayrollRun hideHeader employeesOnly />}
      </section>
      </main>
      <Footer />
    </div>
  );
};

export default AdminDashboard;
