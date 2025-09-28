import React, { useState } from "react";
import Modal from "../ui/Modal";

// SessionList.jsx
// Presentational list for sessions. Receives `sessions` and optional `students`.
// Props:
// - sessions: array of session objects
// - students: array of student objects (optional)
// - onPlay(session)
// - onEdit(session)
// - onDelete(sessionId)
// - onViewReport(sessionId)

export default function SessionList({
  sessions = [],
  students = [],
  onPlay = () => {},
  onEdit = () => {},
  onDelete = () => {},
  onViewReport = () => {},
}) {
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null });

  const getStudentName = (id) => {
    const s = (students || []).find((st) => st.id === id);
    return s ? s.name : id || "(unassigned)";
  };

  const openDelete = (id) => setDeleteModal({ open: true, id });
  const closeDelete = () => setDeleteModal({ open: false, id: null });

  const confirmDelete = async () => {
    if (deleteModal.id) {
      await onDelete(deleteModal.id);
    }
    closeDelete();
  };

  if (!sessions || sessions.length === 0) {
    return <p className="text-gray-500">No sessions created yet.</p>;
  }

  return (
    <div className="space-y-4">
      {sessions.map((s) => (
        <div key={s.id} className="p-4 border rounded-md bg-white shadow-sm flex justify-between items-start">
          <div className="w-3/4">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg font-semibold">{s.id}</h3>
              <span className={`text-xs px-2 py-1 rounded ${s.isCompleted ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}>
                {s.isCompleted ? "Completed" : "In progress"}
              </span>
            </div>

            <div className="text-sm text-gray-600 mt-1">
              <div>Student: <strong>{getStudentName(s.studentId)}</strong></div>
              <div>Strategy: <strong>{s.selectionStrategy || "fixed"}</strong></div>
              <div>Tasks: <strong>{(s.taskIds || []).length}</strong> &nbsp;|&nbsp; Responses: <strong>{(s.responses || []).length}</strong></div>
            </div>

            <div className="text-xs text-gray-400 mt-2">
              {s.startedAt && <div>Started: {new Date(s.startedAt).toLocaleString()}</div>}
              {s.updatedAt && <div>Last updated: {new Date(s.updatedAt).toLocaleString()}</div>}
            </div>
          </div>

          <div className="flex flex-col space-y-2 w-1/4 items-end">
            <button onClick={() => onPlay(s)} className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600">Play</button>
            <button onClick={() => onViewReport(s.id)} className="bg-indigo-500 text-white px-3 py-1 rounded hover:bg-indigo-600">Report</button>
            <button onClick={() => onEdit(s)} className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600">Edit</button>
            <button onClick={() => openDelete(s.id)} className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600">Delete</button>
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
