import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";

import HomePage from "./LandiningPage/homePage.js";
import UserLogin from "./Login/UserLogin .js";
import SignUpPage from "./Signup/SignUpPage";
import HospitalDashboard from "./DashBoard/HospitalDashboard";
 // ✅ New import
import ProtectedRoute from "./components/ProtectedRoute";

import Footer from "./company/Footer";
import { HOSPITAL_WORKSPACE_ROLES, ROLES } from "./Admin/roles";
import AdminDashboard from "./Admin/AdminDashboard.js"
import PatientPortal from "./Patients/PatientPortal";
import DoctorDashboard from "./Doctors/DoctorDashboard";
import PayrollRun from "./pages/payroll/PayrollRun";
import AmbulanceDriverPage from "./Operations/AmbulanceDriverPage";

const adminPayrollRedirect = (roles, location) => {
  const isAdmin = roles.some((role) => [
    ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.CLINIC_ADMIN,
  ].includes(role));
  if (isAdmin && new URLSearchParams(location.search).get("section") === "overtime-allowances") {
    return "/AdminDashboard?section=payroll&payrollView=overtime";
  }
  return null;
};

const PageWithLayout = ({ children }) => (
  <>
    <main className="flex-1 min-h-[calc(100vh-120px)] bg-gray-50">{children}</main>
    <Footer />
  </>
);

const PayrollPortalRoute = () => {
  const location = useLocation();
  if (new URLSearchParams(location.search).get("section") === "payslips") {
    return <Navigate to="/AdminDashboard" replace />;
  }
  return <PayrollRun />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PageWithLayout>
              <HomePage />
            </PageWithLayout>
          }
        />
        <Route path="/UserLogin" element={<UserLogin />} />
        <Route path="/PatientLogin" element={<UserLogin portal="patient" />} />
        <Route path="/DoctorLogin" element={<UserLogin portal="doctor" />} />
        <Route path="/HospitalLogin" element={<UserLogin portal="hospital" />} />
        <Route path="/SignUpPage" element={<SignUpPage />} />
        <Route path="/AmbulanceDriver" element={<AmbulanceDriverPage />} />

        {/* Role-Based Protected Routes */}
        <Route
          path="/DoctorDashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.DOCTOR]}>
              <DoctorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/HospitalDashboard"
          element={
            <ProtectedRoute allowedRoles={HOSPITAL_WORKSPACE_ROLES}>
              <HospitalDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/AdminDashboard"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.HOSPITAL_ADMIN, ROLES.CLINIC_ADMIN]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/PatientPortal"
          element={
            <ProtectedRoute allowedRoles={[ROLES.PATIENT]}>
              <PatientPortal />
            </ProtectedRoute>
          }
        />
        <Route
          path="/PayrollPortal"
          element={
            <ProtectedRoute allowedRoles={[...HOSPITAL_WORKSPACE_ROLES, ROLES.DOCTOR]}
              redirectFor={adminPayrollRedirect}>
              <PayrollPortalRoute />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
