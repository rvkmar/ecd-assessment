import React, { useEffect, useState } from "react";
import SessionList from "./SessionList";
import SessionForm from "./SessionForm";
import SessionReport from "./SessionReport";

// SessionBuilder.jsx
// Top-level manager for Sessions

export default function SessionBuilder({ notify }) {
  const [sessions, setSessions] = useState([]);
  const [students, setStudents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [reportSessionId, setReportSessionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  // Load sessions + supporting collections
  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/sessions").then((r) => r.json()),
      fetch("/api/students").then((r) => r.json()),
      fetch("/api/tasks").then((r) => r.json()),
    ])
      .then(([sessData, stuData, taskData]) => {
        setSessions(sessData || []);
        setStudents(stuData || []);
        setTasks(taskData || []);
      })
      .catch((err) => {
        console.error("Failed to load sessions/students/tasks", err);
        notify?.("Failed to load sessions or supporting data");
      })
      .finally(() => setLoading(false));
  };

  // Create session only (no PUT/update)
  const handleSave = async (sessionPayload) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sessionPayload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create session");
      }
      const created = await res.json();
      setSessions((prev) => [...prev, created]);
      notify?.("Session created.");
      setSelectedSession(null);
    } catch (e) {
      console.error(e);
      notify?.(`❌ ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this session? This cannot be undone.")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Failed to delete (status ${res.status})`);
      }
      setSessions((prev) => prev.filter((s) => s.id !== id));
      notify?.("Session deleted.");
    } catch (e) {
      console.error(e);
      notify?.("❌ Failed to delete session");
    } finally {
      setBusy(false);
    }
  };

  const handlePause = async (id) => {
    try {
      const res = await fetch(`/api/sessions/${id}/pause`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to pause session");
      const updated = await res.json();
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      notify?.("Session paused.");
    } catch (e) {
      console.error(e);
      notify?.("❌ Failed to pause session");
    }
  };

  const handleResume = async (id) => {
    try {
      const res = await fetch(`/api/sessions/${id}/resume`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to resume session");
      const updated = await res.json();
      setSessions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      notify?.("Session resumed.");
    } catch (e) {
      console.error(e);
      notify?.("❌ Failed to resume session");
    }
  };

  const handlePlay = (session) => {
    window.location.href = `/sessions/${session.id}/player`;
  };

  const handleViewReport = (sessionId) => {
    setReportSessionId(sessionId);
  };

  if (loading) {
    return <div className="p-6">Loading sessions...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Student Sessions</h2>
        <div className="flex items-center space-x-2">
          <button
            className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            onClick={() =>
              setSelectedSession({
                taskIds: [],
                studentId: students[0]?.id || "",
                selectionStrategy: "fixed",
                nextTaskPolicy: {},
                status: "in-progress",
              })
            }
          >
            + New Session
          </button>
        </div>
      </div>

      {/* Session list */}
      <SessionList
        sessions={sessions}
        students={students}
        onPlay={handlePlay}
        onPause={handlePause}
        onResume={handleResume}
        onDelete={handleDelete}
        onViewReport={handleViewReport}
      />

      {/* Editor / Form area */}
      {selectedSession && (
        <div className="p-4 border rounded-md bg-gray-50">
          <h3 className="text-lg font-semibold">New Session</h3>
          <div className="mt-3">
            <SessionForm
              model={selectedSession}
              students={students}
              tasks={tasks}
              onSave={handleSave}
              onCancel={() => setSelectedSession(null)}
              notify={notify}
            />
          </div>
        </div>
      )}

      {/* Report viewer */}
      {reportSessionId && (
        <div className="p-4 border rounded-md bg-gray-50">
          <SessionReport
            sessionId={reportSessionId}
            onClose={() => setReportSessionId(null)}
          />
        </div>
      )}

      {busy && <div className="text-sm text-gray-500">Working...</div>}
    </div>
  );
}
