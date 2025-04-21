// ProtectedRoute.js
import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("username");

  return isAuthenticated ? children : <Navigate to="/UserLogin" replace />;
};

export default ProtectedRoute;
