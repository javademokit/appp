import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import HomePage from "./LandiningPage/homePage.js";
import UserLogin from "./Login/UserLogin .js";
import SignUpPage from "./Signup/SignUpPage";
import HospitalDashboard from "./DashBoard/HospitalDashboard";
import ProtectedRoute from "./components/ProtectedRoute"; // ✅ import here

import Header from "./company/Header";
import Footer from "./company/Footer";

const PageWithLayout = ({ children }) => (
  <>
    <Header />
    <main className="flex-1 min-h-[calc(100vh-120px)] bg-gray-50">{children}</main>
    <Footer />
  </>
);

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
        <Route path="/SignUpPage" element={<SignUpPage />} />

        {/* ✅ Protected Route */}
        <Route
          path="/HospitalDashboard"
          element={
            <ProtectedRoute>
              <HospitalDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
