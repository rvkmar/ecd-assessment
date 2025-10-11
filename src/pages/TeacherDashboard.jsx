import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../api/apiClient";
import DashboardLayout from "../components/ui/DashboardLayout";
import { Button } from "@/components/ui/button";
import Spinner from "../components/ui/Spinner";
import toast from "react-hot-toast";

import QuestionBank from "../components/questions/QuestionBank";
import TasksManager from "../components/tasks/TasksManager";
import SessionBuilder from "../components/sessions/SessionBuilder";
import AnalyticsPanel from "../components/AnalyticsPanel";

import QuestionBankTabs from "@/components/questions/QuestionBankTabs";

export default function TeacherDashboard() {
  const { auth, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/teacher/data", {}, auth)
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
    //   <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
    //   {loading ? (
    //     <Spinner />
    //   ) : (
    //     <pre className="mt-4 bg-gray-100 p-3 rounded text-sm">
    //       {JSON.stringify(data, null, 2)}
    //     </pre>
    //   )}
        <DashboardLayout
          title="Teacher Dashboard"
          tabs={[
            { id: "questions", label: "QuestionBank", content: <QuestionBankTabs />, entity: "questions" },
            { id: "activities", label: "Activities", content: <TasksManager />, entity: "tasks" },
            { id: "sessions", label: "Sessions", content: <SessionBuilder />, entity: "sessions" },
            { id: "analytics", label: "Analytics", content: <AnalyticsPanel />, entity: "reports" },
          ]}
        />
      // {/* </div> */}
  );
}

