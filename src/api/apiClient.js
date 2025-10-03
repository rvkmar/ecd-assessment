import { useAuth } from "../auth/AuthProvider";

// A wrapper around fetch that includes Authorization header if logged in
export function apiFetch(url, options = {}, auth) {
  const headers = {
    ...(options.headers || {}),
    "Content-Type": "application/json",
  };
  if (auth?.token) headers["Authorization"] = `Bearer ${auth.token}`;

  return fetch(url, { ...options, headers }).then(async (res) => {
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text}`);
    }
    return res.json();
  });
}

