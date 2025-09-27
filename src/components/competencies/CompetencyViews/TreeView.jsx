import React, { useState } from "react";
import Modal from "../../Modal";

export default function TreeView({ competencies, onEdit, onDelete }) {
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "" });

  const renderNode = (node, level = 0) => {
    const children = competencies.filter((c) => c.parentId === node.id);
    return (
      <li key={node.id} className="mb-1">
        <div className="flex items-center gap-2">
          <span className="font-medium" style={{ marginLeft: `${level * 1.5}rem` }}>
            {node.name}
          </span>
          <div className="ml-auto flex gap-2">
            <button
              onClick={() => onEdit(node)}
              className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded"
            >
              Edit
            </button>
            <button
              onClick={() => setDeleteModal({ open: true, id: node.id, name: node.name })}
              className="text-xs bg-red-500 text-white px-2 py-0.5 rounded"
            >
              Delete
            </button>
          </div>
        </div>
        {children.length > 0 && (
          <ul className="ml-4 border-l pl-2 mt-1">
            {children.map((child) => renderNode(child, level + 1))}
          </ul>
        )}
      </li>
    );
  };

  const roots = competencies.filter((c) => !c.parentId);

  return (
    <div>
      <ul>{roots.map((r) => renderNode(r))}</ul>

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
