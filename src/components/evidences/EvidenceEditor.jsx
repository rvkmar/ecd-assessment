import React from "react";

/**
 * EvidenceEditor
 *
 * Simple editor for evidences in an Evidence Model.
 * Now styled consistently with RubricManager and other editors.
 * Each evidence has: { id, description }
 */
export default function EvidenceEditor({ evidences, setEvidences }) {
  const addEvidence = () => {
    setEvidences([
      ...evidences,
      {
        id: `ev${Date.now()}`,
        description: "New Evidence",
      },
    ]);
  };

  const updateEvidence = (id, updates) => {
    setEvidences(
      evidences.map((e) => (e.id === id ? { ...e, ...updates } : e))
    );
  };

  const removeEvidence = (id) => {
    setEvidences(evidences.filter((e) => e.id !== id));
  };

  return (
    <div className="p-4 border rounded-md space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Evidences</h3>
        <button
          type="button"
          onClick={addEvidence}
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          + Add Evidence
        </button>
      </div>

      {evidences.length === 0 && (
        <p className="text-gray-500 text-sm">No evidences defined yet.</p>
      )}

      <ul className="space-y-3">
        {evidences.map((e) => (
          <li
            key={e.id}
            className="p-3 border rounded bg-gray-50 space-y-2 shadow-sm"
          >
            {/* ID (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Evidence ID
              </label>
              <input
                type="text"
                value={e.id}
                readOnly
                className="w-full border rounded p-2 bg-gray-100 text-sm"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                rows={2}
                value={e.description}
                onChange={(ev) =>
                  updateEvidence(e.id, { description: ev.target.value })
                }
                className="w-full border rounded p-2 text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => removeEvidence(e.id)}
                className="bg-red-500 text-white px-3 py-1 rounded"
              >
                ✕ Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
