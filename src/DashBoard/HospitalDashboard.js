import React, { useState, useEffect } from "react";
import {
  FaUserInjured,
  FaCalendarCheck,
  FaUserMd,
  FaFileAlt,
  FaCogs,
  FaUserCircle,
  FaSignOutAlt,
  FaBookMedical,
  FaTachometerAlt
} from "react-icons/fa";

import Header from "../company/Header";
import Footer from "../company/Footer";
import Patients from "../Patients/Patients";
import Dashboard from "../Admin/Dashboard";
import AppointmentsList from "../AppointmentsList/AppointmentsList";
import Doctors from "../Doctors/Doctors";

import SettingsPage from "../Settings/SettingsPage";
import BookAppointment from "../Patients/BookAppointment"; 
import ReportViewer from "../ReportViewer/ReportViewer";
import "./HospitalDashboard.css";

const HospitalDashboard = () => {
  const [activePage, setActivePage] = useState("dashboard");
  const [username, setUsername] = useState("");

  // Load username from localStorage
  useEffect(() => {
    const storedUsername = localStorage.getItem("username");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  // Handle logout
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/UserLogin";
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
      case "doctors":
        return <Doctors />;
      case "reports":
        return <ReportViewer />;
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
            <li onClick={() => setActivePage("dashboard")}>
              <FaTachometerAlt /> Dashboard
            </li>
            <li onClick={() => setActivePage("book-appointment")}>
              <FaBookMedical /> Book Appointment
            </li>
            <li onClick={() => setActivePage("patients")}>
              <FaUserInjured /> Patients
            </li>
            <li onClick={() => setActivePage("appointments")}>
              <FaCalendarCheck /> Appointments
            </li>
            <li onClick={() => setActivePage("doctors")}>
              <FaUserMd /> Doctors
            </li>
            <li onClick={() => setActivePage("reports")}>
              <FaFileAlt /> Reports
            </li>
            <li onClick={() => setActivePage("settings")}>
              <FaCogs /> Settings
            </li>
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
