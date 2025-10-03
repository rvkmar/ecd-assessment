// src/auth/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";

/**
 * ProtectedRoute restricts access to users with expectedRole.
 * expectedRole can be a string (single role) or an array of allowed roles.
 */
export default function ProtectedRoute({ expectedRole, children }) {
  const { auth } = useAuth();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const allowed = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
  if (!allowed.includes(auth.role)) {
    // role mismatch → immediate logout / redirect to login
    sessionStorage.removeItem("ecd_auth_v1");
    return <Navigate to="/login" replace />;
  }

  return children;
}
