import React, { useState } from "react";
import { loadDB, saveDB } from "../utils/db";
import Modal from "./Modal";
import Card from "./Card";

function CompetencyTree({ nodes, parentId = null, onEdit, onRemove }) {
  const [expanded, setExpanded] = useState({});
  const children = nodes.filter((n) => n.parentId === parentId);

  if (!children.length) return null;

  return (
    <ul className="pl-4 border-l border-gray-300">
      {children.map((node) => (
        <li key={node.id} className="mb-1">
          <div className="flex items-center gap-2">
            {/* Expand/Collapse */}
            {nodes.some((n) => n.parentId === node.id) && (
              <button
                className="text-xs bg-gray-200 px-1 rounded"
                onClick={() =>
                  setExpanded((prev) => ({
                    ...prev,
                    [node.id]: !prev[node.id],
                  }))
                }
              >
                {expanded[node.id] ? "−" : "+"}
              </button>
            )}

            {/* Competency name */}
            <span className="font-medium">{node.name}</span>

            {/* Actions */}
            <button
              onClick={() => onEdit(node)}
              className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded"
            >
              Edit
            </button>
            <button
              onClick={() => onRemove(node.id)}
              className="text-xs bg-red-500 text-white px-2 py-0.5 rounded"
            >
              Remove
            </button>
          </div>

          {/* Children */}
          {expanded[node.id] && (
            <CompetencyTree
              nodes={nodes}
              parentId={node.id}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

export default function CompetencyModels({ notify }) {
  const [competencies, setCompetencies] = useState(loadDB().competencyModels || []);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftParentId, setDraftParentId] = useState("");
  const [editId, setEditId] = useState(null);
  const [modal, setModal] = useState({ open: false, id: null });

  const saveCompetency = () => {
    if (!draftName.trim()) return notify("Enter competency name");
    const db = loadDB();

    if (editId) {
      db.competencyModels = db.competencyModels.map((c) =>
        c.id === editId
          ? {
              ...c,
              name: draftName,
              description: draftDescription,
              parentId: draftParentId || null,
            }
          : c
      );
      notify("Competency updated.");
    } else {
      db.competencyModels.push({
        id: `c${Date.now()}`,
        name: draftName,
        description: draftDescription,
        parentId: draftParentId || null,
      });
      notify("Competency added.");
    }

    saveDB(db);
    setCompetencies(db.competencyModels);
    setDraftName("");
    setDraftDescription("");
    setDraftParentId("");
    setEditId(null);
  };

  const removeCompetency = (id) => {
    const db = loadDB();
    db.competencyModels = db.competencyModels.filter((c) => c.id !== id);
    saveDB(db);
    setCompetencies(db.competencyModels);
    notify("Competency removed.");
  };

  return (
    <Card title="Competency Models">
      {/* Form */}
      <div className="space-y-2 mb-4">
        <input
          className="border p-2 w-full"
          value={draftName}
          onChange={(e) => setDraftName(e.target.value)}
          placeholder="Competency name"
        />
        <textarea
          className="border p-2 w-full"
          value={draftDescription}
          onChange={(e) => setDraftDescription(e.target.value)}
          placeholder="Description (optional)"
        />
        <select
          className="border p-2 w-full"
          value={draftParentId}
          onChange={(e) => setDraftParentId(e.target.value)}
        >
          <option value="">No parent (root competency)</option>
          {competencies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button
          onClick={saveCompetency}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          {editId ? "Update Competency" : "Add Competency"}
        </button>
      </div>

      {/* Tree view */}
      <CompetencyTree
        nodes={competencies}
        onEdit={(comp) => {
          setDraftName(comp.name);
          setDraftDescription(comp.description || "");
          setDraftParentId(comp.parentId || "");
          setEditId(comp.id);
        }}
        onRemove={(id) => setModal({ open: true, id })}
      />

      {/* Confirmation Modal */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, id: null })}
        onConfirm={() => {
          removeCompetency(modal.id);
          setModal({ open: false, id: null });
        }}
        title="Confirm Delete"
        message="Remove this competency?"
      />
    </Card>
  );
}
