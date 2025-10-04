import React, { useState } from "react";

const CompetencyLinker = ({ models = [], competencies = [], links = [], saveAll, notify }) => {
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [modalIndex, setModalIndex] = useState(null);

  // --- Add new crosslink ---
  const handleLink = () => {
    if (source && destination && source !== destination) {
      // ✅ Prevent duplicate links
      const alreadyExists = links.some(
        (l) => l.sourceId === source && l.destId === destination
      );
      if (alreadyExists) {
        notify?.("This crosslink already exists.");
        return;
      }

      const newLink = { id: `l${Date.now()}`, sourceId: source, destId: destination };
      const updated = [...links, newLink];
      saveAll(models, competencies, updated);
      notify?.("Link added.");
      setSource("");
      setDestination("");
    }
  };

  // --- Remove crosslink ---
  const handleRemove = (index) => {
    const id = links[index].id;
    const updated = links.filter((l) => l.id !== id);
    saveAll(models, competencies, updated);
    notify?.("Link removed.");
  };

  const isLinkDisabled = !source || !destination || source === destination;

  // --- Label builder (model name + depth) ---
  const buildLabel = (c) => {
    if (!c) return "";

    let depth = 0;
    let current = c;
    let root = c;
    while (current && current.parentId) {
      depth++;
      root = competencies.find((p) => p.id === current.parentId) || root;
      current = competencies.find((p) => p.id === current.parentId);
    }

    const model = models.find((m) => m.id === root.modelId);
    const modelPrefix = model ? model.name : "Unknown Model";

    return depth === 0
      ? `${modelPrefix}: ${c.name}`
      : `${modelPrefix} | Level ${depth}: ${c.name}`;
  };

  return (
    <div
      className="competency-linker"
      style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}
    >
      <h4 className="font-medium mb-3">Crosslink Competencies / Skills</h4>

      {/* Source dropdown */}
      <select
        className="border p-2 w-full mb-2"
        value={source}
        onChange={(e) => setSource(e.target.value)}
      >
        <option value="">Select Source</option>
        {competencies.map((c) => (
          <option key={c.id} value={c.id}>
            {buildLabel(c)}
          </option>
        ))}
      </select>

      {/* Destination dropdown */}
      <select
        className="border p-2 w-full mb-2"
        value={destination}
        onChange={(e) => setDestination(e.target.value)}
      >
        <option value="">Select Destination</option>
        {competencies.map((c) => (
          <option key={c.id} value={c.id}>
            {buildLabel(c)}
          </option>
        ))}
      </select>

      {/* Crosslink button */}
      <button
        onClick={handleLink}
        disabled={isLinkDisabled}
        className="w-full mb-4 px-3 py-1 bg-blue-500 text-white rounded"
      >
        Crosslink Competency / Skill
      </button>

      {/* Existing links */}
      <div className="linked-competencies">
        <h5 className="font-medium mb-2">Existing Crosslinks</h5>
        <ul className="space-y-1 text-sm">
          {links.map((l, idx) => {
            const src = competencies.find((c) => c.id === l.sourceId);
            const dest = competencies.find((c) => c.id === l.destId);
            return (
              <li key={l.id || idx} className="flex items-center gap-2">
                {buildLabel(src)} → {buildLabel(dest)}
                <button
                  onClick={() => setModalIndex(idx)}
                  className="text-xs bg-red-500 text-white px-2 py-0.5 rounded"
                >
                  Remove
                </button>
              </li>
            );
          })}
          {links.length === 0 && <li className="text-gray-500">No crosslinks yet</li>}
        </ul>
      </div>

      {/* Confirmation Modal */}
      {modalIndex !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-4 rounded shadow-md w-64 relative z-50">
            <h4 className="font-semibold mb-2">Confirm Delete</h4>
            <p className="mb-4">Remove this link?</p>
            <div className="flex justify-end gap-2">
              <button
                className="px-3 py-1 bg-gray-300 rounded"
                onClick={() => setModalIndex(null)}
              >
                Cancel
              </button>
              <button
                className="px-3 py-1 bg-red-500 text-white rounded"
                onClick={() => {
                  handleRemove(modalIndex);
                  setModalIndex(null);
                }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetencyLinker;
