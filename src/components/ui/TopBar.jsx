// src/ui/TopBar.jsx
import React from "react";
import { useAuth } from "../../auth/AuthProvider";

export default function TopBar() {
  const { auth, logout } = useAuth();

  return (
    <div className="w-full flex items-center justify-between px-4 py-2 bg-white border-b">
      <div className="font-semibold">Assessment</div>
      <div className="flex items-center space-x-3">
        {auth ? (
          <>
            <div className="text-sm text-gray-700">Role: <strong>{auth.role}</strong></div>
            <div className="text-sm text-gray-700">User: {auth.username}</div>
            <button
              onClick={() => logout()}
              className="px-3 py-1 bg-red-500 text-white rounded"
            >
              Logout
            </button>
          </>
        ) : (
          <div className="text-sm text-gray-600">Not logged in</div>
        )}
      </div>
    </div>
  );
}
