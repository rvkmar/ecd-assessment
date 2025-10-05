import React, { useState } from "react";
import Modal from "../ui/Modal";

// SessionList.jsx
// Presentational list for sessions. Receives `sessions` and optional `students`.
// Props:
// - sessions: array of session objects
// - students: array of student objects (optional)
// - onPlay(session)
// - onPause(sessionId)
// - onResume(sessionId)
// - onDelete(sessionId)
// - onViewReport(sessionId)

export default function SessionList({
  sessions = [],
  students = [],
  policies = [],
  onPlay = () => {},
  onPause = () => {},
  onResume = () => {},
  onDelete = () => { },
  onArchive = () => {}, 
  onViewReport = () => {},
}) {
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });
  const [expanded, setExpanded] = useState(null); // track which session preview is expanded

  const getStudentName = (id) => {
    const s = (students || []).find((st) => st.id === id);
    return s ? s.name : id || "(unassigned)";
  };

  const getPolicyName = (policyId) => {
    if (!policyId) return null;
    const p = (policies || []).find((pol) => pol.id === policyId);
    return p ? p.name : policyId;
  };

  const openDelete = (id) => setDeleteModal({ open: true, id });
  const closeDelete = () => setDeleteModal({ open: false, id: null });

  const confirmDelete = async () => {
    if (deleteModal.id) {
      await onDelete(deleteModal.id);
    }
    closeDelete();
  };

  const renderTaskPreview = (session) => {
    const tasks = session.tasks || []; // if backend enriched
    const ids = session.taskIds || [];
    if (!ids.length) return <p className="text-xs text-gray-400">No tasks</p>;

    const preview = ids.slice(0, 3).map((tid) => {
      const t = tasks.find((x) => x.id === tid) || { id: tid };
      const q = t.questionId ? `Q: ${t.questionId}` : "No Q";
      const c = t.taskModel?.competencyId || "?";
      const e = t.taskModel?.evidenceId || "?";
      return (
        <li key={tid} className="truncate">
          {q} <span className="text-gray-500">[C: {c}, E: {e}]</span>
        </li>
      );
    });

    return (
      <div className="mt-1 text-xs text-gray-600">
        {expanded === session.id ? (
          <ul className="list-disc ml-5 space-y-0.5">{preview}</ul>
        ) : (
          <ul className="list-disc ml-5 space-y-0.5">{preview}</ul>
        )}
        {ids.length > 3 && (
          <button
            onClick={() =>
              setExpanded(expanded === session.id ? null : session.id)
            }
            className="text-blue-600 hover:underline text-xs mt-1"
          >
            {expanded === session.id
              ? "Show less"
              : `+${ids.length - 3} more`}
          </button>
        )}
      </div>
    );
  };

  if (!sessions || sessions.length === 0) {
    return <p className="text-gray-500">No sessions created yet.</p>;
  }

  return (
    <div className="space-y-4">
      {sessions.map((s) => (
        <div
          key={s.id}
          className="p-4 border rounded-md bg-white shadow-sm flex justify-between items-start"
        >
          <div className="w-3/4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-semibold">{s.id}</h3>
              {/* Status badge with extended lifecycle support */}
              <span
                className={`text-xs px-2 py-1 rounded ${
                  s.status === "reviewed"
                    ? "bg-green-200 text-green-900"
                    : s.autoFinished
                    ? "bg-yellow-100 text-yellow-800"
                    : s.status === "submitted" || s.isCompleted
                    ? "bg-blue-100 text-blue-800"
                    : s.status === "paused"
                    ? "bg-orange-100 text-orange-800"
                    : s.status === "archived"
                    ? "bg-gray-300 text-gray-700"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {s.status === "reviewed"
                  ? "Reviewed"
                  : s.autoFinished
                  ? "Auto-finished"
                  : s.status === "submitted" || s.isCompleted
                  ? "Submitted"
                  : s.status === "paused"
                  ? "Paused"
                  : s.status === "archived"
                  ? "Archived"
                  : "In Progress"}
              </span>
            </div>

            <div className="text-sm text-gray-600 mt-1">
              <div>
                Student: <strong>{getStudentName(s.studentId)}</strong>
              </div>
              <div>
                Strategy: <strong>{s.selectionStrategy || "fixed"}</strong>
                {s.nextTaskPolicy?.policyId && (
                  <span className="ml-2 text-xs text-gray-600">
                    (Policy: {getPolicyName(s.nextTaskPolicy.policyId)})
                  </span>
                )}
              </div>
              <div>
                Tasks: <strong>{(s.taskIds || []).length}</strong> &nbsp;|&nbsp;
                Responses: <strong>{(s.responses || []).length}</strong>
              </div>
              {renderTaskPreview(s)}
            </div>

            <div className="text-xs text-gray-400 mt-2">
              {s.startedAt && (
                <div>Started: {new Date(s.startedAt).toLocaleString()}</div>
              )}
              {s.updatedAt && (
                <div>Last updated: {new Date(s.updatedAt).toLocaleString()}</div>
              )}
            </div>
          </div>

          <div className="flex flex-col space-y-2 w-1/4 items-end">
            {s.status === "in-progress" && (
              <>
                <button
                  onClick={() => onPlay(s)}
                  className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                >
                  Play
                </button>
                <button
                  onClick={() => onPause(s.id)}
                  className="bg-orange-500 text-white px-3 py-1 rounded hover:bg-orange-600"
                >
                  Pause
                </button>
              </>
            )}

            {/* Allow Resume for paused sessions */}
            {s.status === "paused" && (
              <button
                onClick={() => onResume(s.id)}
                className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
              >
                Resume
              </button>
            )}

            {/* When submitted or auto-finished, allow teacher review */}
            {(s.status === "submitted" || s.autoFinished) && (
              <>
                {window.location.pathname.includes("/district/") ? (
                  <a
                    href={`/district/sessions/${s.id}/review`}
                    className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
                  >
                    Review
                  </a>
                ) : (
                  <a
                    href={`/teacher/sessions/${s.id}/review`}
                    className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
                  >
                    Review
                  </a>
                )}
              </>         
            )}
        
            {s.status === "completed" && (
              <button
                onClick={() => onViewReport(s.id)}
                className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600"
              >
                Report
              </button>
            )}

            {/* Reviewed sessions also get a report button */}
            {s.status === "reviewed" && (
              <button
                onClick={() => onViewReport(s.id)}
                className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600"
              >
                Report
              </button>
            )}
        
            {/* Always allow archive */}
            {s.status !== "archived" && (
              <button
                onClick={() => onArchive(s.id)}
                className="bg-gray-600 text-white px-3 py-1 rounded hover:bg-gray-700"
              >
                Archive
              </button>
            )}

            {/* Always allow delete
            <button
              onClick={() => openDelete(s.id)}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Delete
            </button> */}

          </div>
        </div>
      ))}

      <Modal
        isOpen={deleteModal.open}
        onClose={closeDelete}
        onConfirm={confirmDelete}
        title="Delete session"
        message={`Are you sure you want to delete session ${deleteModal.id}? This action cannot be undone.`}
        confirmClass="bg-red-500 hover:bg-red-600 text-white"
      />
    </div>
  );
}
