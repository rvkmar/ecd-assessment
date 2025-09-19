import React, { useState, useEffect, useRef } from "react";
import { loadDB, saveDB } from "../utils/db";

const CompetencyLinker = ({ competencies = [], onLinksChange }) => {
  const [links, setLinks] = useState([]);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [modalIndex, setModalIndex] = useState(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      const db = loadDB();
      let savedLinks = db.competencyLinks || [];

      savedLinks = savedLinks.filter(
        (l) =>
          competencies.some((c) => c.id === l.sourceId) &&
          competencies.some((c) => c.id === l.destId)
      );

      setLinks(savedLinks);
      if (onLinksChange) onLinksChange(savedLinks);

      db.competencyLinks = savedLinks;
      saveDB(db);

      initialized.current = true;
    }
  }, [competencies, onLinksChange]);

  const persistLinks = (updatedLinks) => {
    const db = loadDB();
    db.competencyLinks = updatedLinks;
    saveDB(db);
    setLinks(updatedLinks);
    if (onLinksChange) onLinksChange(updatedLinks);
  };

  const handleLink = () => {
    if (source && destination && source !== destination) {
      const newLink = { sourceId: source, destId: destination };
      const updatedLinks = [...links, newLink];
      persistLinks(updatedLinks);
      setSource("");
      setDestination("");
    }
  };

  const handleRemove = (index) => {
    const updatedLinks = links.filter((_, i) => i !== index);
    persistLinks(updatedLinks);
  };

  const isLinkDisabled = !source || !destination || source === destination;

  // Build label like cm1:..., cm2:..., cm1:Level1:..., cm1:Level2:...
  const buildLabel = (c) => {
    if (!c) return "";

    // Walk up to the root to determine depth
    let depth = 0;
    let current = c;
    let root = c;
    while (current && current.parentId) {
      depth++;
      root = competencies.find((p) => p.id === current.parentId) || root;
      current = competencies.find((p) => p.id === current.parentId);
    }

    // Determine root prefix
    let rootPrefix = "";
    if (root && root.name) {
      if (root.name.toLowerCase().includes("oneself")) rootPrefix = "cm1";
      if (root.name.toLowerCase().includes("others")) rootPrefix = "cm2";
    }

    if (depth === 0) {
      return `${rootPrefix}:${c.name}`;
    }

    return `${rootPrefix}:Level${depth}:${c.name}`;
  };

  const formatLabel = (c) => buildLabel(c);

  return (
    <div className="competency-linker" style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}>
      <h3 className="font-semibold">Crosslinked Competencies</h3>

      <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">Select Source</option>
          {competencies.map((c) => (
            <option key={c.id} value={c.id}>{formatLabel(c)}</option>
          ))}
        </select>

        <select value={destination} onChange={(e) => setDestination(e.target.value)}>
          <option value="">Select Destination</option>
          {competencies.map((c) => (
            <option key={c.id} value={c.id}>{formatLabel(c)}</option>
          ))}
        </select>

        <button onClick={handleLink} disabled={isLinkDisabled} className="px-3 py-1 bg-blue-500 text-white rounded">
          Crosslink Competency
        </button>
      </div>

      <div className="linked-competencies">
        {/* <h4>Crosslinked Competencies</h4> */}
        <ul>
          {links.map((l, idx) => {
            const src = competencies.find((c) => c.id === l.sourceId);
            const dest = competencies.find((c) => c.id === l.destId);
            return (
              <li key={idx} className="flex items-center gap-2">
                {formatLabel(src)} → {formatLabel(dest)}
                <button onClick={() => setModalIndex(idx)} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {modalIndex !== null && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30 z-50">
          <div className="bg-white p-4 rounded shadow-md w-64 relative z-50">
            <h4 className="font-semibold mb-2">Confirm Delete</h4>
            <p className="mb-4">Remove this link?</p>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1 bg-gray-300 rounded" onClick={() => setModalIndex(null)}>
                Cancel
              </button>
              <button className="px-3 py-1 bg-red-500 text-white rounded" onClick={() => { handleRemove(modalIndex); setModalIndex(null); }}>
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
