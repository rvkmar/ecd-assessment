import React, { useState } from "react";
import { loadDB, saveDB, renumberRootCompetencies } from "../utils/db";

import Modal from "./Modal";
import Card from "./Card";

import CompetencyLinker from "./CompetencyLinker";
import CompetencyOverview from "./CompetencyOverview";

function CompetencyTree({ nodes, parentId = null, onEdit, onRemove, level = 0 }) {
  const [expanded, setExpanded] = useState({});
  const children = nodes.filter((n) => n.parentId === parentId);

  if (!children.length) return null;

  return (
    <ul className="pl-8 border-l-2 border-gray-300">
      {children.map((node) => {
        const labelPrefix =
          level === 0 ? `${node.modelLabel || "cm?"}:` : `Level ${level}:`;

        return (
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

              {/* Competency name with prefix */}
              <span className="font-medium">
                {labelPrefix} {node.name}
              </span>

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
                level={level + 1}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

/* --- Dropdown helper --- */
function getCompetencyOptions(nodes, parentId = null, level = 0) {
  const children = nodes.filter((n) => n.parentId === parentId);
  let options = [];

  children.forEach((c) => {
    const labelPrefix =
      level === 0 ? `${c.modelLabel || "cm?"}:` : `Level ${level}:`;

    options.push({
      id: c.id,
      label: `${"— ".repeat(level)}${labelPrefix} ${c.name}`,
    });

    options = options.concat(getCompetencyOptions(nodes, c.id, level + 1));
  });

  return options;
}

export default function CompetencyModels({ notify }) {
  const [competencies, setCompetencies] = useState(loadDB().competencyModels || []);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftParentId, setDraftParentId] = useState("");
  const [editId, setEditId] = useState(null);
  const [modal, setModal] = useState({ open: false, id: null });
  const [showGraph, setShowGraph] = useState(false);
  const [links, setLinks] = useState([]);

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
              parentId: draftParentId.length ? draftParentId : [] || null,
            }
          : c
      );
      notify("Competency updated.");
    } else {
      const rootCount = db.competencyModels.filter((c) => !c.parentId).length;
      const modelLabel = draftParentId ? null : `cm${rootCount + 1}`;

      db.competencyModels.push({
        id: `c${Date.now()}`,
        name: draftName,
        description: draftDescription,
        parentId: draftParentId || null,
        modelLabel: modelLabel,
      });
      notify("Competency added.");
    }
    renumberRootCompetencies(db);
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
    renumberRootCompetencies(db);
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
          {getCompetencyOptions(competencies).map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.label}
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

      <div className="my-4">
        <CompetencyLinker
          competencies={competencies}
          onLinksChange={(updatedLinks) => setLinks(updatedLinks)}
        />
      </div>

      {/* Toggle for graph */}
      <div className="flex items-right gap-3 mb-4">
        <span className="text-sm font-medium text-gray-700">Competency Overview</span>
        <button
          type="button"
          onClick={() => setShowGraph((prev) => !prev)}
          disabled={competencies.length === 0}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            showGraph ? "bg-green-500" : "bg-gray-300"
          } ${competencies.length === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              showGraph ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      <div className={`grid ${showGraph ? "md:grid-cols-2" : "grid-cols-1"} gap-4`}>
        {/* Left: Tree for editing */}
        <div>
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
        </div>

        {/* Right: Graph for overview (conditionally rendered) */}
        {showGraph && (
          <div>
            <CompetencyOverview competencies={competencies} links={links} />
          </div>
        )}
      </div>

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
