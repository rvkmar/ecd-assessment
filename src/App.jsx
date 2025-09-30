import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from "react-router-dom";
import QuestionBank from "./components/questions/QuestionBank";
import CompetencyModelBuilder from "./components/competencies/CompetencyModelBuilder";
import EvidenceModelBuilder from "./components/evidences/EvidenceModelBuilder";
import TaskModelBuilder from "./components/taskModels/TaskModelBuilder";
import TasksManager from "./components/tasks/TasksManager";
import SessionBuilder from "./components/sessions/SessionBuilder";
import SessionPlayer from "./components/sessions/SessionPlayer";
import AnalyticsPanel from "./components/AnalyticsPanel";

import AdminPage from "./pages/AdminPage";
import TeachersManager from "./pages/TeachersManager";
import StudentsManager from "./pages/StudentsManager";

import Toast from "./components/ui/Toast";
import NavBar from "./components/ui/NavBar";

// 🔹 Login screen
function Login({ onLogin }) {
  const navigate = useNavigate();

  const handleSelect = (role) => {
    onLogin(role);
    navigate(`/${role}`);
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-80 text-center">
        <h1 className="text-2xl font-bold mb-6">Assessment Login</h1>
        <p className="mb-4 text-gray-600">Select your role to continue:</p>
        <div className="space-y-3">
          <button
            onClick={() => handleSelect("district")}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            District
          </button>
          <button
            onClick={() => handleSelect("teacher")}
            className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Teacher
          </button>
          <button
            onClick={() => handleSelect("student")}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
          >
            Student
          </button>
        </div>
      </div>
    </div>
  );
}

// 🔹 District dashboard
function DistrictDashboard({ notify }) {
  const [tab, setTab] = useState("questions");

  const tabs = [
    { id: "questions", label: "Question Bank" },
    { id: "competencies", label: "Competencies" },
    { id: "evidence", label: "Evidence Models" },
    { id: "taskModels", label: "Task Models" },
    { id: "tasks", label: "Tasks" },
    { id: "sessions", label: "Sessions" },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">District Dashboard</h2>
      <NavBar tabs={tabs} active={tab} onSelect={setTab} color="blue" />

      {tab === "questions" && <QuestionBank notify={notify} />}
      {tab === "competencies" && <CompetencyModelBuilder notify={notify} />}
      {tab === "evidence" && <EvidenceModelBuilder notify={notify} />}
      {tab === "taskModels" && <TaskModelBuilder notify={notify} />}
      {tab === "tasks" && <TasksManager notify={notify} />}
      {tab === "sessions" && <SessionBuilder notify={notify} />}
      {tab === "analytics" && <AnalyticsPanel />}
    </div>
  );
}

// 🔹 Teacher dashboard
import ClassReport from "./components/reports/ClassReport";

function TeacherDashboard({ notify }) {
  const [tab, setTab] = useState("questions");
  const [showClassReport, setShowClassReport] = useState(false);

  const tabs = [
    { id: "questions", label: "Question Bank" },
    { id: "tasks", label: "Tasks" },
    { id: "sessions", label: "Sessions" },
  ];

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Teacher Dashboard</h2>
      <NavBar tabs={tabs} active={tab} onSelect={setTab} color="green" />

      {tab === "questions" && <QuestionBank notify={notify} />}
      {tab === "tasks" && <TasksManager notify={notify} />}
      {tab === "sessions" && (
        <>
          <SessionBuilder notify={notify} />
          <button
            onClick={() => setShowClassReport(true)}
            className="mt-4 px-3 py-1 bg-indigo-600 text-white rounded"
          >
            View Class Report
          </button>
        </>
      )}

      {showClassReport && (
        <ClassReport classId="class8" onClose={() => setShowClassReport(false)} />
      )}
    </div>
  );
}

// 🔹 Student dashboard
function StudentDashboard({ notify }) {
  const [sessionId, setSessionId] = useState("");
  const [sessions, setSessions] = useState([]);

  React.useEffect(() => {
    fetch("/api/sessions/active")
      .then((r) => r.json())
      .then((data) => setSessions(data || []))
      .catch(() => notify("❌ Failed to load sessions"));
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Student Dashboard</h2>
      {sessions.length > 0 ? (
        <select
          className="border p-2 rounded mb-3"
          value={sessionId}
          onChange={(e) => setSessionId(e.target.value)}
        >
          <option value="">-- choose session --</option>
          {sessions.map((s) => (
            <option key={s.id} value={s.id}>{s.id} {s.isCompleted ? "(completed)" : ""}</option>
          ))}
        </select>
      ) : (
        <p className="text-sm text-gray-500">No sessions available</p>
      )}

      {sessionId && <SessionPlayer sessionId={sessionId} />}
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [toast, setToast] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login onLogin={setRole} />} />
        <Route path="/district/*" element={role === "district" ? <DistrictDashboard notify={notify} /> : <Navigate to="/login" />} />
        <Route path="/teacher/*" element={role === "teacher" ? <TeacherDashboard notify={notify} /> : <Navigate to="/login" />} />
        <Route path="/student/*" element={role === "student" ? <StudentDashboard notify={notify} /> : <Navigate to="/login" />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/students" element={<StudentsManager notify={notify} />} />
        <Route path="/teachers" element={<TeachersManager notify={notify} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-100 border-t py-2 text-center text-xs text-gray-500">
        <p>v0.8.1 · A prototype by Ravikumar Rajabhather, Lecturer, DIET Chennai</p>
      </footer>

      {toast && <Toast message={toast} />}
    </Router>
  );
}
