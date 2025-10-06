import React, { useEffect, useState } from "react";
import SessionList from "./SessionList";
import SessionForm from "./SessionForm";
import SessionReport from "./SessionReport";
import NavBar from "../ui/NavBar";
import Modal from "../ui/Modal";
import toast from "react-hot-toast";


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
  const [sessionTab, setSessionTab] = useState("active"); // "active" | "archived"
  const [activeCount, setActiveCount] = useState(0);
  const [archivedCount, setArchivedCount] = useState(0);

  const [deleteModal, setDeleteModal] = useState({ open: false, sessionId: null });

  // const notify = (msg, type = "info") => {
  //   if (type === "success") toast.success(msg);
  //   else if (type === "error") toast.error(msg);
  //   else toast(msg);
  // };

  // Load sessions + supporting collections
  useEffect(() => {
    loadAll();
  }, []);

  // const loadAll = async () => {
  //   setLoading(true);
  //   try {
  //     const [sessData, stuData, taskData] = await Promise.all([
  //       fetch("/api/sessions").then((r) => r.json()),
  //       fetch("/api/students").then((r) => r.json()),
  //       fetch("/api/tasks").then((r) => r.json()),
  //     ]);

  //     // enrich tasks with taskModel info
  //     const enrichedTasks = await Promise.all(
  //       (taskData || []).map(async (t) => {
  //         if (t.taskModelId) {
  //           try {
  //             const tm = await fetch(`/api/taskModels/${t.taskModelId}`).then(
  //               (r) => r.json()
  //             );
  //             return { ...t, taskModel: tm };
  //           } catch {
  //             return t;
  //           }
  //         }
  //         return t;
  //       })
  //     );

  //     setSessions(sessData || []);
  //     setStudents(stuData || []);
  //     setTasks(enrichedTasks);
  //   } catch (err) {
  //     console.error("Failed to load sessions/students/tasks", err);
  //     notify?.("❌ Failed to load sessions or supporting data");
  //   } finally {
  //     setLoading(false);
  //   }
  // };

    const loadAll = () => {
    setLoading(true);

    const sessionsUrl =
      sessionTab === "archived" ? "/api/sessions/archived" : "/api/sessions/active";
    Promise.all([
      fetch("/api/sessions/active").then((r) => r.json()),    // for counts
      fetch("/api/sessions/archived").then((r) => r.json()),  // for counts
      fetch(sessionsUrl).then((r) => r.json()),               // actual list
      fetch("/api/students").then((r) => r.json()),
      fetch("/api/tasks").then((r) => r.json()),
    ])
      .then(([activeData, archivedData, currentData, stuData, taskData]) => {
        setActiveCount((activeData || []).length);
        setArchivedCount((archivedData || []).length);
        setSessions(currentData || []);   // ✅ show active or archived depending on tab
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

  // const handleDelete = async (id) => {
  //   if (!confirm("Delete this session? This cannot be undone.")) return;
  //   setBusy(true);
  //   try {
  //     const res = await fetch(`/api/sessions/${id}`, { method: "DELETE" });
  //     if (!res.ok) {
  //       const err = await res.json().catch(() => ({}));
  //       throw new Error(err.error || `Failed to delete (status ${res.status})`);
  //     }
  //     setSessions((prev) => prev.filter((s) => s.id !== id));
  //     notify?.("Session deleted.");
  //   } catch (e) {
  //     console.error(e);
  //     notify?.("❌ Failed to delete session");
  //   } finally {
  //     setBusy(false);
  //   }
  // };

  const confirmDeleteSession = (sessionId) => {
    setDeleteModal({ open: true, sessionId });
  };

  const performDeleteSession = async () => {
    const { sessionId } = deleteModal;
    if (!sessionId) return setDeleteModal({ open: false, sessionId: null });
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete session");
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      notify?.("✅ Session deleted successfully");
    } catch (err) {
      notify?.("❌ Failed to delete session: " + err.message);
    } finally {
      setDeleteModal({ open: false, sessionId: null });
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

    const handleArchive = async (id) => {
    try {
      const res = await fetch(`/api/sessions/${id}/archive`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to archive session");
      const updated = await res.json();
      notify?.("Session archived.");
      // Reload sessions so it disappears from Active and shows in Archived
      loadAll();
    } catch (e) {
      console.error(e);
      notify?.("❌ Failed to archive session");
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

      <NavBar
        tabs={[
          { id: "active", label: `Active Sessions (${activeCount})` },
          { id: "archived", label: `Archived Sessions (${archivedCount})` },
        ]}
        active={sessionTab}
        onSelect={setSessionTab}
        color="indigo"
      />

      {/* Session list */}
      <SessionList
        sessions={sessions}
        students={students}
        onPlay={handlePlay}
        onPause={handlePause}
        onResume={handleResume}
        // onDelete={confirmDeleteSession}
        onArchive={handleArchive}   // ✅ instead of onDelete
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
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, sessionId: null })}
        onConfirm={performDeleteSession}
        title="Confirm Delete"
        message="Delete this session? This action cannot be undone."
        confirmClass="bg-red-500 hover:bg-red-600 text-white"
      />
    </div>
  );
}
