import React, { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../api/apiClient";
import Spinner from "../components/ui/Spinner";
import toast from "react-hot-toast";

import DashboardLayout from "../components/ui/DashboardLayout";
import SessionPlayer from "../components/sessions/SessionPlayer";

export default function StudentDashboard() {
  const { auth, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/student/data", {}, auth)
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Session expired or unauthorized. Please log in again.");
        logout();
      });
  }, [auth]);

  return (
    // <div className="p-6">
    //   <h1 className="text-2xl font-bold">Student Dashboard</h1>
    //   {loading ? (
    //     <Spinner />
    //   ) : (
    //     <pre className="mt-4 bg-gray-100 p-3 rounded text-sm">
    //       {JSON.stringify(data, null, 2)}
    //     </pre>
    //   )}
      <DashboardLayout
        title="Student Dashboard"
        tabs={[
          { id: "mysessions", label: "My Sessions", content: <div>Upcoming/Active Sessions here</div> },
          { id: "play", label: "Play", content: <SessionPlayer /> },
        ]}
      />
    // </div>
  );
}
