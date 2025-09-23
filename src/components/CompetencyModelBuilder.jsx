import React, { useState, useEffect } from "react";
import {
  getCompetencies,
  addCompetency,
  deleteCompetency,
} from "../utils/dualStorageUtils";

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

              <span className="font-medium">
                {labelPrefix} {node.name}
              </span>

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
  const [competencies, setCompetencies] = useState([]);
  const [draftName, setDraftName] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftParentId, setDraftParentId] = useState("");
  const [editId, setEditId] = useState(null);
  const [modal, setModal] = useState({ open: false, id: null });
  const [showGraph, setShowGraph] = useState(false);
  const [links, setLinks] = useState([]);

  useEffect(() => {
    getCompetencies().then(setCompetencies);
  }, []);

  const saveCompetency = async () => {
    if (!draftName.trim()) return notify("Enter competency name");

    if (editId) {
      // For simplicity, treat update as delete + add
      await deleteCompetency(editId);
      await addCompetency({
        name: draftName,
        description: draftDescription,
        parentId: draftParentId || null,
      });
      notify("Competency updated.");
    } else {
      await addCompetency({
        name: draftName,
        description: draftDescription,
        parentId: draftParentId || null,
      });
      notify("Competency added.");
    }

    const updated = await getCompetencies();
    setCompetencies(updated);

    setDraftName("");
    setDraftDescription("");
    setDraftParentId("");
    setEditId(null);
  };

  const removeCompetency = async (id) => {
    await deleteCompetency(id);
    const updated = await getCompetencies();
    setCompetencies(updated);
    notify("Competency and its children removed.");
  };

  return (
    <Card title="Competency Models">
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
          ></span>
        </button>
      </div>

      <div className={`grid ${showGraph ? "md:grid-cols-2" : "grid-cols-1"} gap-4`}>
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

        {showGraph && (
          <div>
            <CompetencyOverview competencies={competencies} links={links} />
          </div>
        )}
      </div>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, id: null })}
        onConfirm={() => {
          if (modal.id) removeCompetency(modal.id);
          setModal({ open: false, id: null });
        }}
        title="Confirm Delete"
        message="Remove this competency?"
      />
    </Card>
  );
}
