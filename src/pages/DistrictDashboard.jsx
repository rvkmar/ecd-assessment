import React, { useEffect, useState } from "react";
import DashboardLayout from "../components/ui/DashboardLayout";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../api/apiClient";
import Spinner from "../components/ui/Spinner";
import toast from "react-hot-toast";

import QuestionBank from "../components/questions/QuestionBank";
import CompetencyModelBuilder from "../components/competencies/CompetencyModelBuilder";
import EvidenceModelBuilder from "../components/evidences/EvidenceModelBuilder";
import TaskModelBuilder from "../components/taskModels/TaskModelBuilder";
import TasksManager from "../components/tasks/TasksManager";
import SessionBuilder from "../components/sessions/SessionBuilder";
import AnalyticsPanel from "../components/AnalyticsPanel";

import QuestionBankTabs from "@/components/questions/QuestionBankTabs";

export default function DistrictDashboard() {
  const { auth, logout } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/api/district/data", {}, auth)
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
    //   <h1 className="text-2xl font-bold">District Dashboard</h1>
    //   {loading ? (
    //     <Spinner />
    //   ) : (
    //     <pre className="mt-4 bg-gray-100 p-3 rounded text-sm">
    //       {JSON.stringify(data, null, 2)}
    //     </pre>
    //   )}

      <DashboardLayout
        title="District Dashboard"
        tabs={[
          { id: "questions", label: "QuestionBank", content: <QuestionBankTabs /> },
          { id: "competencies", label: "Competencies", content: <CompetencyModelBuilder /> },
          { id: "evidence", label: "Evidences", content: <EvidenceModelBuilder /> },
          { id: "tasks", label: "Activity Templates", content: <TaskModelBuilder /> },
          { id: "activities", label: "Activities", content: <TasksManager /> },
          { id: "sessions", label: "Sessions", content: <SessionBuilder /> },
          { id: "analytics", label: "Analytics", content: <AnalyticsPanel /> },
        ]}
      />
    // </div>
  );
}
