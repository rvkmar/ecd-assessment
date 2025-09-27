import React, { useState } from "react";

export default function EvidenceEditor({ evidences, setEvidences }) {
  const [newDescription, setNewDescription] = useState("");

  const addEvidence = () => {
    if (!newDescription.trim()) return;
    const newEvidence = {
      id: `ev${Date.now()}`,
      description: newDescription.trim(),
    };
    setEvidences([...evidences, newEvidence]);
    setNewDescription("");
  };

  const updateEvidence = (id, description) => {
    setEvidences(
      evidences.map((ev) =>
        ev.id === id ? { ...ev, description } : ev
      )
    );
  };

  const removeEvidence = (id) => {
    setEvidences(evidences.filter((ev) => ev.id !== id));
  };

  return (
    <div className="p-4 border rounded-md space-y-2">
      <h3 className="text-lg font-semibold">Evidences</h3>

      {/* Add new evidence */}
      <div className="flex space-x-2">
        <input
          type="text"
          className="flex-1 border p-2 rounded"
          placeholder="New evidence description"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
        />
        <button
          type="button"
          onClick={addEvidence}
          className="bg-blue-500 text-white px-3 py-1 rounded"
        >
          Add
        </button>
      </div>

      {/* List existing evidences */}
      {evidences.length === 0 && (
        <p className="text-gray-500">No evidences added yet.</p>
      )}

      <ul className="space-y-2">
        {evidences.map((ev) => (
          <li key={ev.id} className="flex items-center space-x-2">
            <input
              type="text"
              className="flex-1 border p-1 rounded"
              value={ev.description}
              onChange={(e) => updateEvidence(ev.id, e.target.value)}
            />
            <button
              type="button"
              onClick={() => removeEvidence(ev.id)}
              className="bg-red-500 text-white px-2 py-1 rounded"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
