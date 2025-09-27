import React, { useState } from "react";
import Modal from "../../Modal";

export default function TableView({ competencies, onEdit, onDelete }) {
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "" });

  return (
    <div>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border px-2 py-1 text-left">Name</th>
            <th className="border px-2 py-1 text-left">Description</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {competencies.map((c) => (
            <tr key={c.id}>
              <td className="border px-2 py-1">{c.name}</td>
              <td className="border px-2 py-1">{c.description}</td>
              <td className="border px-2 py-1 text-center space-x-2">
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
              </td>
            </tr>
          ))}
        </tbody>
      </table>

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
