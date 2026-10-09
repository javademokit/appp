// ProtectedRoute.js
import React, { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { apiFetch } from "../API/api";
import { normalizeRoles } from "../Admin/roles";

const ProtectedRoute = ({ children, allowedRoles = [], redirectFor }) => {
  const [authState, setAuthState] = useState({ status: "checking", roles: [] });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let active = true;
    apiFetch("/users/me")
      .then((response) => {
        if (!response.ok) throw new Error("Session expired");
        return response.json();
      })
      .then((account) => {
        if (active) setAuthState({ status: "authenticated", roles: normalizeRoles(account.roles) });
      })
      .catch(() => {
        if (active) setAuthState({ status: "anonymous", roles: [] });
      });

    return () => {
      active = false;
    };
  }, []);

  const logout = async () => {
    try {
      await apiFetch("/users/logout", { method: "POST" });
    } finally {
      navigate("/UserLogin", { replace: true });
    }
  };

  if (authState.status === "checking") return <div role="status">Checking session...</div>;
  if (authState.status === "anonymous") return <Navigate to="/UserLogin" replace />;
  const normalizedAllowedRoles = normalizeRoles(allowedRoles);
  if (normalizedAllowedRoles.length && !normalizedAllowedRoles.some((role) => authState.roles.includes(role))) {
    return <main className="role-denied">
      <h1>Access not permitted</h1>
      <p>This account does not have a role authorized for this workspace.</p>
      <button type="button" onClick={logout}>Sign out</button>
    </main>;
  }
  const redirectTo = redirectFor?.(authState.roles, location);
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return children;
};

export default ProtectedRoute;
