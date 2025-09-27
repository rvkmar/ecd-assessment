import React from "react";

export default function EvidenceModelList({ models, onEdit, onDelete }) {
  if (!models || models.length === 0) {
    return <p className="text-gray-500">No evidence models defined yet.</p>;
  }

  return (
    <div className="space-y-4">
      {models.map((m) => (
        <div
          key={m.id}
          className="p-4 border rounded-md bg-white shadow-sm flex justify-between items-start"
        >
          <div className="space-y-1">
            {/* Name + description */}
            <h3 className="text-lg font-semibold">{m.name}</h3>
            {m.description && (
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
                Model:{" "}
                <strong>{m.measurementModel?.type || "not set"}</strong>
              </span>
            </div>

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
              onClick={() => onDelete(m.id)}
              className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
