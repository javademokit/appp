import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaUserInjured,
  FaCalendarCheck,
  FaUserMd,
  FaFileAlt,
  FaCogs,
  FaUserCircle,
  FaSignOutAlt,
  FaBookMedical,
  FaTachometerAlt,
  FaCreditCard
} from "react-icons/fa";
import { Building2, CalendarClock, FileBadge, FlaskConical, Pill, Siren } from "lucide-react";

import Header from "../company/Header";
import Footer from "../company/Footer";
import Patients from "../Patients/Patients";
import Dashboard from "../Admin/Dashboard";
import AppointmentsList from "../AppointmentsList/AppointmentsList";
import SettingsPage from "../Settings/SettingsPage";
import BookAppointment from "../Patients/BookAppointment"; 
import ReportViewer from "../ReportViewer/ReportViewer";
import PaymentPage from "../PaymentPage/PaymentPage";
import "./HospitalDashboard.css";
import DoctorProfile  from "../Doctors/DoctorProfile";
import Doctors from "../Doctors/Doctors";
import { apiFetch } from "../API/api";
import PharmacyPage from "../Operations/PharmacyPage";
import LabsDiagnosticsPage from "../Operations/LabsDiagnosticsPage";
import EmergencyTriagePage from "../Operations/EmergencyTriagePage";
import StaffShiftsPage from "../Operations/StaffShiftsPage";
import DischargePage from "../Operations/DischargePage";
import WardManagement from "../NursingWardManagement/WardManagement";

const HospitalDashboard = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const [username, setUsername] = useState("");
  const [roles, setRoles] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    apiFetch("/users/me")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((user) => {
        const assignedRoles = (user.roles || []).map((role) => String(role).replace(/^ROLE_/, "").toUpperCase());
        setUsername(user.username);
        setRoles(assignedRoles);
        if (assignedRoles.some((role) => ["NURSE", "HEAD_NURSE"].includes(role))
          && !assignedRoles.some((role) => ["SUPER_ADMIN", "HOSPITAL_ADMIN", "CLINIC_ADMIN"].includes(role))) {
          setActivePage("ward-management");
        }
      })
      .catch(() => navigate("/UserLogin", { replace: true }));
  }, [navigate]);

  const nursingOnly = roles.some((role) => ["NURSE", "HEAD_NURSE"].includes(role))
    && !roles.some((role) => ["SUPER_ADMIN", "HOSPITAL_ADMIN", "CLINIC_ADMIN"].includes(role));
  const nursingAccess = roles.some((role) => [
    "SUPER_ADMIN", "HOSPITAL_ADMIN", "CLINIC_ADMIN", "CRM_EXECUTIVE", "NURSE", "HEAD_NURSE",
  ].includes(role));
  const handleLogout = async () => {
    try {
      await apiFetch("/users/logout", { method: "POST" });
    } finally {
      navigate("/UserLogin", { replace: true });
    }
  };

  // Render the main content
  const renderContent = () => {
    switch (activePage) {
      case "dashboard":
        return <Dashboard />;
      case "book-appointment":
        return <BookAppointment />;
      case "patients":
        return <Patients />;
      case "appointments":
        return <AppointmentsList />;
      case "doctorsp":
        return <DoctorProfile />;
      case "reports":
        return <ReportViewer />;
      case "billing":
        return <PaymentPage />;
      case "discharges":
        return <DischargePage />;
      case "pharmacy":
        return <PharmacyPage />;
      case "laboratory":
        return <LabsDiagnosticsPage />;
      case "emergency":
        return <EmergencyTriagePage />;
      case "staff-shifts":
        return <StaffShiftsPage />;
      case "ward-management":
        return <WardManagement />;
      case "DoctorTimeSlots":
        return <Doctors />;
      case "settings":
          return <SettingsPage />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="dashboard-container">
      <Header />

      <div className="dashboard-body">
        {/* Sidebar Navigation */}
        <div className="sidebar">
          <ul>
            {!nursingOnly && <>
            <li className={activePage === "dashboard" ? "active" : ""} aria-current={activePage === "dashboard" ? "page" : undefined} onClick={() => setActivePage("dashboard")}>
              <FaTachometerAlt /> Dashboard
            </li>
            <li className={activePage === "book-appointment" ? "active" : ""} aria-current={activePage === "book-appointment" ? "page" : undefined} onClick={() => setActivePage("book-appointment")}>
              <FaBookMedical /> Book Appointment
            </li>
            <li className={activePage === "patients" ? "active" : ""} aria-current={activePage === "patients" ? "page" : undefined} onClick={() => setActivePage("patients")}>
              <FaUserInjured /> Patients
            </li>
            <li className={activePage === "appointments" ? "active" : ""} aria-current={activePage === "appointments" ? "page" : undefined} onClick={() => setActivePage("appointments")}>
              <FaCalendarCheck /> Appointments
            </li>
            <li className={activePage === "doctorsp" ? "active" : ""} aria-current={activePage === "doctorsp" ? "page" : undefined} onClick={() => setActivePage("doctorsp")}>
              <FaUserMd /> Doctors
            </li>
            <li className={activePage === "reports" ? "active" : ""} aria-current={activePage === "reports" ? "page" : undefined} onClick={() => setActivePage("reports")}>
              <FaFileAlt /> Reports
            </li>
            <li className={activePage === "billing" ? "active" : ""} aria-current={activePage === "billing" ? "page" : undefined} onClick={() => setActivePage("billing")}>
              <FaCreditCard /> Billing & Payments
            </li>
            <li className={activePage === "discharges" ? "active" : ""} aria-current={activePage === "discharges" ? "page" : undefined} onClick={() => setActivePage("discharges")}>
              <FileBadge size={16} /> Discharge &amp; Claims
            </li>
            <li className={activePage === "DoctorTimeSlots" ? "active" : ""} aria-current={activePage === "DoctorTimeSlots" ? "page" : undefined} onClick={() => setActivePage("DoctorTimeSlots")}>
              <FaCalendarCheck /> Doctor Schedule
            </li>
            <li className={activePage === "staff-shifts" ? "active" : ""} aria-current={activePage === "staff-shifts" ? "page" : undefined} onClick={() => setActivePage("staff-shifts")}>
              <CalendarClock size={16} /> Staff &amp; Shifts
            </li>
            </>}
            {nursingAccess && <li className={activePage === "ward-management" ? "active" : ""} aria-current={activePage === "ward-management" ? "page" : undefined} onClick={() => setActivePage("ward-management")}>
              <Building2 size={16} /> Nursing &amp; Ward Management
            </li>}
            {!nursingOnly && <>
            <li className={activePage === "pharmacy" ? "active" : ""} aria-current={activePage === "pharmacy" ? "page" : undefined} onClick={() => setActivePage("pharmacy")}>
              <Pill size={16} /> Pharmacy
            </li>
            <li className={activePage === "laboratory" ? "active" : ""} aria-current={activePage === "laboratory" ? "page" : undefined} onClick={() => setActivePage("laboratory")}>
              <FlaskConical size={16} /> Lab &amp; Diagnostics
            </li>
            <li className={activePage === "emergency" ? "active" : ""} aria-current={activePage === "emergency" ? "page" : undefined} onClick={() => setActivePage("emergency")}>
              <Siren size={16} /> Triage &amp; Emergency
            </li>
            <li className={activePage === "settings" ? "active" : ""} aria-current={activePage === "settings" ? "page" : undefined} onClick={() => setActivePage("settings")}>
              <FaCogs /> Settings
            </li>
            </>}
          </ul>
        </div>

        {/* Main Content */}
        <div className="main-content">{renderContent()}</div>
      </div>

      {/* Top-right Profile and Logout */}
      <div className="top-right-icons">
        <div className="user-profile">
          <FaUserCircle />
          <span>{username ? `Username: ${username}` : "Username: Guest"}</span>
        </div>
        <div className="logout" onClick={handleLogout} style={{ cursor: "pointer" }}>
          <FaSignOutAlt />
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default HospitalDashboard;
