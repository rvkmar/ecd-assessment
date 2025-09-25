import React, { useState } from "react";

import { exportDB, importDB } from "./utils/db";
import Modal from "./components/Modal";
// import ItemBank from "./components/ItemBank";
import QuestionBank from "./components/QuestionBank";
import CompetencyModelBuilder from "./components/competencies/CompetencyModelBuilder";
import EvidenceModelBuilder from "./components/evidences/EvidenceModelBuilder";
import TasksManager from "./components/TasksManager";
import StudentSession from "./components/StudentSession";
import AnalyticsPanel from "./components/AnalyticsPanel";
import Toast from "./components/Toast";

export default function App() {
  const [role, setRole] = useState("teacher");
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [refreshFlag, setRefreshFlag] = useState(false);
  const [toast, setToast] = useState("");
  const [tab, setTab] = useState("items");

  const [importError, setImportError] = useState("");

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2000);
  };

  const refresh = () => setRefreshFlag(!refreshFlag);

  // Create session via API
  const startSession = async (taskId) => {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, studentId: "student1" }),
    });
    if (res.ok) {
      const data = await res.json();
      setActiveSessionId(data.id);
    } else {
      notify("❌ Failed to start session");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-blue-600">Assessment</h1>
        <h3 className="text-lg font-semibold">v0.8.1</h3>
        <p className="italic text-gray-600">A prototype by Ravikumar Rajabhather, Lecturer, DIET Chennai</p>
        <div className="flex items-center gap-2">
          <select
            className="border p-2 rounded"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
          </select>
          {role === "teacher" && (
            <>
              <button
                onClick={exportDB}
                className="px-3 py-1 bg-purple-500 text-white rounded"
              >
                Export
              </button>
            </>
          )}
        </div>
      </div>

      {/* Teacher Tabs */}
      {role === "teacher" && (
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex gap-4 border-b mb-4">
            <button
              className={`pb-2 ${tab === "items" ? "border-b-2 border-blue-500 font-semibold" : "text-gray-500"}`}
              onClick={() => setTab("items")}
            >
              Item Bank
            </button>
            <button
              className={`pb-2 ${tab === "competency" ? "border-b-2 border-blue-500 font-semibold" : "text-gray-500"}`}
              onClick={() => setTab("competency")}
            >
              Competencies
            </button>
            <button
              className={`pb-2 ${tab === "models" ? "border-b-2 border-blue-500 font-semibold" : "text-gray-500"}`}
              onClick={() => setTab("models")}
            >
              Evidences
            </button>
            <button
              className={`pb-2 ${tab === "tasks" ? "border-b-2 border-blue-500 font-semibold" : "text-gray-500"}`}
              onClick={() => setTab("tasks")}
            >
              Tasks/Actions
            </button>
            <button
              className={`pb-2 ${tab === "analytics" ? "border-b-2 border-blue-500 font-semibold" : "text-gray-500"}`}
              onClick={() => setTab("analytics")}
            >
              Analytics
            </button>
          </div>

          {/* {tab === "items" && <ItemBank notify={notify} />} */}
          {tab === "items" && <QuestionBank notify={notify} />}
          {tab === "competency" && <CompetencyModelBuilder notify={notify} />}
          {tab === "models" && <EvidenceModelBuilder notify={notify} />}
          {tab === "tasks" && <TasksManager notify={notify} />}
          {tab === "analytics" && <AnalyticsPanel refreshFlag={refreshFlag} />}
        </div>
      )}

      {/* Student View */}
      {role === "student" && !activeSessionId && (
        <div className="bg-white rounded-xl shadow p-4">
          <h3 className="font-semibold mb-2">Available Tasks</h3>
          <TaskList startSession={startSession} />
        </div>
      )}

      {role === "student" && activeSessionId && (
        <StudentSession
          sessionId={activeSessionId}
          onFinish={() => {
            setActiveSessionId(null);
            refresh();
          }}
        />
      )}

      {/* 🆕 Import Error Modal */}
      <Modal
        isOpen={!!importError}
        title="Import Error"
        message={importError}
        onClose={() => setImportError("")}
        onConfirm={() => setImportError("")}
      />

      <Toast message={toast} />
    </div>
  );
}

function TaskList({ startSession }) {
  const [tasks, setTasks] = useState([]);

  useState(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => setTasks(data || []));
  }, []);

  if (tasks.length === 0) return <p>No tasks available</p>;

  return (
    <ul className="space-y-2">
      {tasks.map((t) => (
        <li key={t.id} className="flex justify-between items-center">
          <span>{t.title}</span>
          <button
            onClick={() => startSession(t.id)}
            className="px-2 py-1 bg-blue-500 text-white rounded"
          >
            Start
          </button>
        </li>
      ))}
    </ul>
  );
}
