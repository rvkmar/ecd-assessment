// src/components/taskModels/TaskModelList.jsx
import React, { useEffect, useState } from "react";
import Modal from "../ui/Modal";

export default function TaskModelList({ models, onEdit, onDelete }) {
  const [evidenceModels, setEvidenceModels] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    id: null,
    name: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/evidenceModels").then((res) => res.json()),
      fetch("/api/questions").then((res) => res.json()),
    ])
      .then(([ems, qs]) => {
        setEvidenceModels(ems || []);
        setQuestions(qs || []);
      })
      .catch(() => {
        setEvidenceModels([]);
        setQuestions([]);
      });
  }, []);

  const getEvidenceModelName = (id) =>
    evidenceModels.find((em) => em.id === id)?.name || null;

  const getQuestionText = (id) => {
    const q = questions.find((qq) => qq.id === id);
    return q ? (q.stem || q.text || q.id) : null;
  };

  if (!models || models.length === 0) {
    return <p className="text-gray-500">No task models defined yet.</p>;
  }

  return (
    <div className="space-y-4">
      {models.map((m) => (
        <div
          key={m.id}
          className="p-4 border rounded-md bg-white shadow-sm flex justify-between items-start"
        >
          <div className="space-y-2">
            {/* Name + description */}
            <h3 className="text-lg font-semibold">{m.name}</h3>
            {m.description && (
              <p className="text-sm text-gray-600">{m.description}</p>
            )}

            {/* Metadata summary */}
            <div className="text-sm text-gray-700 space-x-4 mt-2">
              <span>
                Difficulty: <strong>{m.difficulty || "medium"}</strong>
              </span>
              <span>
                Evidence Models:{" "}
                <strong>{m.evidenceModelIds?.length || 0}</strong>
              </span>
              <span>
                Expected Observations:{" "}
                <strong>{m.expectedObservations?.length || 0}</strong>
              </span>
              <span>
                Item Mappings: <strong>{m.itemMappings?.length || 0}</strong>
              </span>
            </div>

            {/* Linked evidence models */}
            {m.evidenceModelIds?.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-medium">Linked Evidence Models:</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {m.evidenceModelIds.map((id) => {
                    const name = getEvidenceModelName(id);
                    return (
                      <li key={id}>
                        {name ? (
                          <>
                            {name}{" "}
                            <span className="text-gray-500">({id})</span>
                          </>
                        ) : (
                          <code>{id}</code>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* Expected Observations */}
            {m.expectedObservations?.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-medium">Expected Observations:</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {m.expectedObservations.map((eo, i) => (
                    <li key={i}>
                      Obs: <code>{eo.observationId}</code>, Ev:{" "}
                      <code>{eo.evidenceId}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Item mappings */}
            {m.itemMappings?.length > 0 && (
              <div className="mt-2">
                <h4 className="text-sm font-medium">Item Mappings:</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  {m.itemMappings.map((map, i) => {
                    const itemText = getQuestionText(map.itemId);
                    return (
                      <li key={i}>
                        Obs: <code>{map.observationId}</code>, Ev:{" "}
                        <code>{map.evidenceId}</code> ↳ Item:{" "}
                        {itemText ? (
                          <>
                            {itemText.slice(0, 40)}{" "}
                            <span className="text-gray-500">
                              ({map.itemId})
                            </span>
                          </>
                        ) : (
                          <code>{map.itemId}</code>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {/* ✅ Created & Last updated */}
            <div className="text-xs text-gray-400 mt-2 space-y-1">
              {m.createdAt && (
                <p>Created: {new Date(m.createdAt).toLocaleString()}</p>
              )}
              {m.updatedAt && (
                <p>Last updated: {new Date(m.updatedAt).toLocaleString()}</p>
              )}
            </div>
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
              onClick={() =>
                setDeleteModal({ open: true, id: m.id, name: m.name })
              }
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      ))}

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
        message={`Are you sure you want to delete task model "${deleteModal.name}"?`}
        confirmClass="bg-red-500 hover:bg-red-600 text-white"
      />
    </div>
  );
}
