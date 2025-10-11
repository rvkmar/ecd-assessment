// src/auth/ProtectedRoute.jsx
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import { can } from "@/config/rolePermissions";

/**
 * ProtectedRoute restricts access to users with expectedRole.
 * expectedRole can be a string (single role) or an array of allowed roles.
 */
export default function ProtectedRoute({ expectedRole, children }) {
  const { auth } = useAuth();
  const role = auth?.role;

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const allowed = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
  if (!allowed.includes(role)) {
    // role mismatch → immediate logout / redirect to login
    sessionStorage.removeItem("ecd_auth_v1");
    return <Navigate to="/login" replace />;
  }

  // Optional: restricts access if entity-specific permissions missing
  // Example: if route has a data-entity prop
  const entity = children?.props?.entity;
  if (entity && !can(role, "view", entity)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
}
