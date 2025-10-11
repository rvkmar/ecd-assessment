import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider";
import { apiFetch } from "../api/apiClient";
import DashboardLayout from "../components/ui/DashboardLayout";
import { PolicyManager } from "../components/policies/PolicyManager";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Spinner from "../components/ui/Spinner";
import toast from "react-hot-toast";

import QuestionBankTabs from "@/components/questions/QuestionBankTabs";
import CompetencyModelBuilder from "@/components/competencies/CompetencyModelBuilder";
import EvidenceModelBuilder from "@/components/evidences/EvidenceModelBuilder";
import TaskModelBuilder from "@/components/taskModels/TaskModelBuilder"

// Reusable placeholder table
function PlaceholderTable({ columns }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 text-sm">
        <thead className="bg-gray-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-2 text-left font-medium text-gray-700 border-b"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            {columns.map((col) => (
              <td key={col} className="px-4 py-2 border-b">
                Sample {col}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch("/api/admin/data", {}, auth)
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

  if (loading) return <Spinner />;

  return (
    <DashboardLayout
      title="Admin Dashboard"
      tabs={[
        { id: "questions", label: "QuestionBank", content: <QuestionBankTabs />, entity: "questions" },
        { id: "competencies", label: "Competencies", content: <CompetencyModelBuilder />, entity: "competencyModels" },
        { id: "evidence", label: "Evidences", content: <EvidenceModelBuilder />, entity: "evidenceModels" },
        { id: "tasks", label: "Activity Templates", content: <TaskModelBuilder />, entity: "taskModels" },
        // {
        //   id: "questions",
        //   label: "Questions",
        //   content: <QuestionDashboard />,
        //   entity: "questions"
        // },
        {
          id: "users",
          label: "Users",
          content: (
            <div>
              <div className="flex gap-4 mb-4">
                <Button onClick={() => navigate("/students")}>Manage Students</Button>
                <Button onClick={() => navigate("/teachers")}>Manage Teachers</Button>
              </div>
              <PlaceholderTable columns={["User ID", "Name", "Role", "District/Class", "Actions"]} />
            </div>
          ),
          entity: "teachers"
        },
        {
          id: "policies",
          label: "Policies",
          content: (
            <div>
              <PolicyManager />
            </div>
          ),
          entity: "policies"
        },
        {
          id: "settings",
          label: "Settings",
          content: (
            <div>
              <Button
                className="bg-red-600 text-white"
                onClick={async () => {
                  if (!confirm("This will delete ALL assessment data. Continue?")) return;
                  await fetch("/api/admin/clear-all", { method: "POST" });
                  toast.success("All data cleared.");
                }}
              >
                Clear All Data
              </Button>
              <PlaceholderTable columns={["Setting", "Value", "Actions"]} />,
            </div>
          ),
          entity: "reports"
        },
      ]}
    />
  );
}
