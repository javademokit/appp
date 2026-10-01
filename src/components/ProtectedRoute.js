// ProtectedRoute.js
import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { apiFetch } from "../API/api";

const ProtectedRoute = ({ children }) => {
  const [authState, setAuthState] = useState("checking");

  useEffect(() => {
    let active = true;
    apiFetch("/users/me")
      .then((response) => {
        if (active) setAuthState(response.ok ? "authenticated" : "anonymous");
      })
      .catch(() => {
        if (active) setAuthState("anonymous");
      });

    return () => {
      active = false;
    };
  }, []);

  if (authState === "checking") return <div role="status">Checking session...</div>;
  return authState === "authenticated" ? children : <Navigate to="/UserLogin" replace />;
};

export default ProtectedRoute;
