// src/App.jsx
import React, { useState, useEffect } from "react";
import { exportDB } from "./utils/db";
import Modal from "./components/ui/Modal";
import QuestionBank from "./components/questions/QuestionBank";
import CompetencyModelBuilder from "./components/competencies/CompetencyModelBuilder";
import EvidenceModelBuilder from "./components/evidences/EvidenceModelBuilder";
import TasksManager from "./components/taskModels/TaskModelManager";
import StudentSession from "./components/sessions/StudentSession";
import AnalyticsPanel from "./components/AnalyticsPanel";
import Toast from "./components/ui/Toast";

function TaskList() {
  const [tasks, setTasks] = useState([]);
  const [taskModels, setTaskModels] = useState([]);

  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => setTasks(data || []));
    fetch("/api/taskModels")
      .then((r) => r.json())
      .then((data) => setTaskModels(data || []));
  }, []);

  const getTaskModelName = (id) => {
    const tm = taskModels.find((m) => m.id === id);
    return tm ? tm.name : id;
  };

  return (
    <div className="p-2">
      <h3 className="font-semibold mb-2">Tasks</h3>
      <ul className="list-disc ml-5">
        {tasks.map((t) => (
          <li key={t.id}>
            <span className="font-medium">
              {getTaskModelName(t.taskModelId)}
            </span>{" "}
            (<code>{t.id}</code>)
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState("teacher");
  const [tab, setTab] = useState("items");
  const [toast, setToast] = useState(null);

  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (role === "student") {
      fetch("/api/sessions")
        .then((r) => r.json())
        .then((data) => setSessions(data || []))
        .catch(() => notify("❌ Failed to load sessions"));
    }
  }, [role]);

  return (
    <div className="p-4">
      <header className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold">Assessment</h1>
        <div className="flex items-center gap-2">
          <select
            className="border p-2 rounded"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="teacher">Teacher</option>
            <option value="student">Student</option>
            </select>
          </div>
      </header>

      {/* Teacher Tabs */}
      {role === "teacher" && (
        <div>
          <nav className="mb-3">
            <button
              onClick={() => setTab("items")}
              className={`px-3 py-1 mr-2 ${
                tab === "items" ? "bg-green-500 text-white" : "bg-gray-200"
              }`}
            >
              Items
            </button>
            <button
              onClick={() => setTab("competency")}
              className={`px-3 py-1 mr-2 ${
                tab === "competency" ? "bg-green-500 text-white" : "bg-gray-200"
              }`}
            >
              Competency
            </button>
            <button
              onClick={() => setTab("models")}
              className={`px-3 py-1 mr-2 ${
                tab === "models" ? "bg-green-500 text-white" : "bg-gray-200"
              }`}
            >
              Evidences
            </button>
            <button
              onClick={() => setTab("tasks")}
              className={`px-3 py-1 mr-2 ${
                tab === "tasks" ? "bg-green-500 text-white" : "bg-gray-200"
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setTab("analytics")}
              className={`px-3 py-1 ${
                tab === "analytics" ? "bg-green-500 text-white" : "bg-gray-200"
              }`}
            >
              Analytics
            </button>
          </nav>

          {tab === "items" && <QuestionBank notify={notify} />}
          {tab === "competency" && <CompetencyModelBuilder notify={notify} />}
          {tab === "models" && <EvidenceModelBuilder notify={notify} />}
          {tab === "tasks" && <TasksManager notify={notify} />}
          {tab === "analytics" && <AnalyticsPanel />}
        </div>
      )}

      {/* Student View */}
      {role === "student" && (
        <div>
          <h2 className="font-semibold mb-2">Select a Session</h2>
          {sessions.length > 0 ? (
            <select
              className="border p-2 mb-3"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
            >
              <option value="">-- choose session --</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id} {s.isCompleted ? "(completed)" : ""}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-gray-500">No sessions available</p>
          )}

          {selectedSessionId && (
            <StudentSession sessionId={selectedSessionId} notify={notify} />
          )}
        </div>
      )}

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-100 border-t py-2 text-center text-xs text-gray-500">
        <p>
          v0.8.1 · A prototype by Ravikumar Rajabhather, Lecturer, DIET Chennai
        </p>
      </footer>

      {toast && <Toast message={toast} />}
    </div>
  );
}
