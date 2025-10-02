import React, { useEffect, useState } from "react";
import Modal from "../ui/Modal";

export default function EvidenceModelList({ models, onEdit, onDelete }) {
  const [competencies, setCompetencies] = useState([]);
  const [modelsData, setModelsData] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [expanded, setExpanded] = useState({}); // track expanded state by constructId
  const [deleteModal, setDeleteModal] = useState({ open: false, id: null, name: "" });

  useEffect(() => {
    Promise.all([
      fetch("/api/competencies").then((res) => res.json()),
      fetch("/api/competencies/models").then((res) => res.json()),
      fetch("/api/questions").then((res) => res.json()),
    ])
      .then(([comps, mods, qs]) => {
        setCompetencies(comps || []);
        setModelsData(mods || []);
        setQuestions(qs || []);
      })
      .catch(() => {
        setCompetencies([]);
        setModelsData([]);
        setQuestions([]);
      });
  }, []);

  const getCompetency = (id) => competencies.find((c) => c.id === id);
  const getModelName = (modelId) =>
    modelsData.find((m) => m.id === modelId)?.name || "Unknown Model";
  const getQuestionText = (id) =>
    questions.find((q) => q.id === id)?.stem ||
    questions.find((q) => q.id === id)?.text ||
    `Unknown Question (${id})`;

  const toggleExpand = (constructId) => {
    setExpanded((prev) => ({
      ...prev,
      [constructId]: !prev[constructId],
    }));
  };

  if (!models || models.length === 0) {
    return <p className="text-gray-500">No evidence models defined yet.</p>;
  }

  return (
    <div className="space-y-4">
      {models.map((m) => {
        const coveredConstructs = m.constructs || [];

        return (
          <div
            key={m.id}
            className="p-4 border rounded-md bg-white shadow-sm flex justify-between items-start"
          >
            <div className="space-y-2">
              {/* Name + description */}
              <h3 className="text-lg font-semibold">
                {m.name && m.name.trim() !== "" ? m.name : "(Untitled Model)"}
              </h3>
              {m.description && m.description.trim() !== "" && (
                <p className="text-sm text-gray-600">{m.description}</p>
              )}

              {/* Schema summary */}
              <div className="text-sm text-gray-700 space-x-4 mt-2">
                <span>
                  Evidences: <strong>{m.evidences?.length || 0}</strong>
                </span>
                <span>
                  Constructs: <strong>{m.constructs?.length || 0}</strong>
                </span>
                <span>
                  Observations: <strong>{m.observations?.length || 0}</strong>
                </span>
                <span>
                  Rubrics: <strong>{m.rubrics?.length || 0}</strong>
                </span>
                <span>
                  Model: {" "}
                  <strong>{m.measurementModel?.type || "not set"}</strong>
                </span>
              </div>

              {/* Covered competencies */}
              {coveredConstructs.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium">Covers Competencies:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                    {coveredConstructs.map((c) => {
                      const comp = getCompetency(c.competencyId);
                      if (!comp) return null;

                      const linkedObs =
                        (m.observations || []).filter(
                          (o) => o.constructId === c.id
                        ) || [];

                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            className="text-blue-600 hover:underline"
                            onClick={() => toggleExpand(c.id)}
                          >
                            {expanded[c.id] ? "▼" : "▶"} {comp.name} (
                            {getModelName(comp.modelId)})
                          </button>

                          {expanded[c.id] && linkedObs.length > 0 && (
                            <ul className="list-circle list-inside ml-6 text-gray-600 space-y-1">
                              {linkedObs.map((o) => (
                                <li key={o.id}>
                                  Obs: {o.text || o.id}
                                  {o.linkedQuestionIds?.length > 0 && (
                                    <ul className="list-disc list-inside ml-6 text-gray-500">
                                      {o.linkedQuestionIds.map((qid) => (
                                        <li key={qid}>{getQuestionText(qid)}</li>
                                      ))}
                                    </ul>
                                  )}
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Rubric details */}
              {m.rubrics && m.rubrics.length > 0 && (
                <div className="mt-2">
                  <h4 className="text-sm font-medium">Rubrics:</h4>
                  <ul className="list-disc list-inside text-sm text-gray-700 space-y-1 ml-4">
                    {m.rubrics.map((r) => (
                      <li key={r.id}>
                        {r.name || r.id}
                        {r.description && <span className="text-gray-500"> – {r.description}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Last updated */}
              {m.updatedAt && (
                <p className="text-xs text-gray-400">
                  Last updated: {new Date(m.updatedAt).toLocaleString()}
                </p>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex flex-col space-y-2">
              <button
                onClick={() => onEdit(m)}
                className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
              >
                Edit
              </button>
              <button
                  onClick={() => setDeleteModal({ open: true, id: m.id, name: m.name })}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Delete
              </button>
            </div>
          </div>
        );
      })}
      
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
        message={`Are you sure you want to delete evidence model "${deleteModal.name}"?`}
        confirmClass="bg-red-500 hover:bg-red-600 text-white"
      />
    </div>
  );
}
