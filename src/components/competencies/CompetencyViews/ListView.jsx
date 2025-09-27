import React, { useState } from "react";
import Modal from "../../Modal";

export default function ListView({ competencies, onEdit, onDelete }) {
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "" });

  return (
    <div>
      <ul className="space-y-2">
        {competencies.map((c) => (
          <li key={c.id} className="flex items-center gap-2 border-b py-2">
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-gray-500">{c.description}</div>
            </div>
            <div className="ml-auto flex gap-2">
              <button
                onClick={() => onEdit(c)}
                className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded"
              >
                Edit
              </button>
              <button
                onClick={() => setDeleteModal({ open: true, id: c.id, name: c.name })}
                className="text-xs bg-red-500 text-white px-2 py-0.5 rounded"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {/* Delete confirmation modal */}
      <Modal
        isOpen={deleteModal.open}
        onClose={() => setDeleteModal({ open: false, id: null, name: "" })}
        onConfirm={() => {
          if (deleteModal.id) {
            onDelete(deleteModal.id);
          }
          setDeleteModal({ open: false, id: null, name: "" });
        }}
        title="Confirm Delete"
        message={`Are you sure you want to delete competency "${deleteModal.name}"? This will also remove its descendants.`}
        confirmClass="bg-red-500 hover:bg-red-600 text-white"
      />
    </div>
  );
}
