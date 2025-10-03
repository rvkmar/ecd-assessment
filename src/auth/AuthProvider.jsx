// src/auth/AuthProvider.jsx
import React, { createContext, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

const STORAGE_KEY = "ecd_auth_v1";
const LOGIN_URL = process.env.REACT_APP_AUTH_URL || "/api/login";

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [auth, setAuth] = useState(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  // Auto-logout when token expires
  useEffect(() => {
    if (!auth?.token) return;

    try {
      const { exp } = jwtDecode(auth.token);
      const now = Date.now() / 1000;
      if (exp) {
        const timeout = (exp - now) * 1000;
        if (timeout > 0) {
          const timer = setTimeout(() => logout(), timeout);
          return () => clearTimeout(timer);
        } else {
          logout();
        }
      }
    } catch {
      logout();
    }
  }, [auth]);

  const login = async ({ username, password, role }) => {
    if (!username || !password || !role) {
      throw new Error("username, password and role required");
    }

    try {
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, role }),
      });

      if (!res.ok) {
        let errText = `Login failed (${res.status})`;
        try {
          const errBody = await res.json();
          if (errBody?.error) errText = errBody.error;
        } catch {}
        throw new Error(errText);
      }

      const data = await res.json();
      const token = data.token;

      try {
        const decoded = jwtDecode(token);
        const now = Date.now() / 1000;
        if (decoded.exp && decoded.exp < now) {
          throw new Error("Token expired");
        }
      } catch (e) {
        throw new Error("Invalid token");
      }

      setAuth({ username: data.username, role: data.role, token });
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ username: data.username, role: data.role, token }));
    } catch (err) {
      throw new Error(err?.message || "Network/Server error");
    }
  };

  const logout = () => {
    setAuth(null);
    sessionStorage.removeItem(STORAGE_KEY);
    try {
      history.replaceState({}, "logged-out", "/login");
    } catch {}
    navigate("/login", { replace: true });
  };

  // Force logout on back/navigation or cross-tab clear
  useEffect(() => {
    const handlePop = () => {
      if (auth) logout();
    };
    const handlePageShow = (e) => {
      if (auth && e.persisted) logout();
    };
    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY && !sessionStorage.getItem(STORAGE_KEY)) {
        if (auth) logout();
      }
    };

    window.addEventListener("popstate", handlePop);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("popstate", handlePop);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("storage", handleStorage);
    };
  }, [auth]);

  const value = {
    auth,
    login,
    logout,
    isAuthenticated: !!auth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
