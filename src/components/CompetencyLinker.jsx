import React, { useState, useEffect } from "react";
import {
  getLinks,
  addLink,
  deleteLink,
} from "../utils/dualStorageUtils";

const CompetencyLinker = ({ competencies = [], onLinksChange, notify }) => {
  const [links, setLinks] = useState([]);
  const [source, setSource] = useState("");
  const [destination, setDestination] = useState("");
  const [modalIndex, setModalIndex] = useState(null);
  const [showLinker, setShowLinker] = useState(false);
  const [prevLinks, setPrevLinks] = useState([]);

  // useEffect(() => {
  //   getLinks().then((savedLinks) => {
  //     setLinks(savedLinks);
  //     if (onLinksChange) onLinksChange(savedLinks);
  //   });
  // }, [onLinksChange]);

    useEffect(() => {
    getLinks().then((savedLinks) => {
      setLinks(savedLinks);

      if (onLinksChange) {
        if (savedLinks && savedLinks.length > 0) {
          onLinksChange(savedLinks);
        } else {
          console.log("[CompetencyLinker] Skipping empty links update");
        }
      }
    });
  }, [onLinksChange]);

  const handleLink = async () => {
    if (source && destination && source !== destination) {
      const updated = await addLink({ sourceId: source, destId: destination });
      setLinks(updated);
      if (onLinksChange) onLinksChange(updated);
      if (notify) notify("Link added.");
      setSource("");
      setDestination("");
    }
  };

  const handleRemove = async (index) => {
    const id = links[index].id;
    const updated = await deleteLink(id);
    setLinks(updated);
    if (onLinksChange) onLinksChange(updated);
    if (notify) notify("Link removed.");
  };

  const isLinkDisabled = !source || !destination || source === destination;

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

    const modelPrefix = root.modelLabel || "cm?";

    if (depth === 0) {
      return `${modelPrefix}: ${c.name}`;
    }

    return `${modelPrefix} | Level ${depth}: ${c.name}`;
  };

  const formatLabel = (c) => buildLabel(c);

  return (
    <div
      className="competency-linker"
      style={{ marginTop: "1rem", padding: "1rem", border: "1px solid #ccc", borderRadius: "8px" }}
    >
      <div className="flex items-right gap-3 mb-4">
        <span className="text-sm font-medium text-gray-700">Crosslink Competencies</span>
        <button
          type="button"
          onClick={() => setShowLinker((prev) => !prev)}
          disabled={competencies.length === 0}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            showLinker ? "bg-green-500" : "bg-gray-300"
          } ${competencies.length === 0 ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              showLinker ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {showLinker && (
        <>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
            <select value={source} onChange={(e) => setSource(e.target.value)}>
              <option value="">Select Source</option>
              {competencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatLabel(c)}
                </option>
              ))}
            </select>

            <select value={destination} onChange={(e) => setDestination(e.target.value)}>
              <option value="">Select Destination</option>
              {competencies.map((c) => (
                <option key={c.id} value={c.id}>
                  {formatLabel(c)}
                </option>
              ))}
            </select>

            <button
              onClick={handleLink}
              disabled={isLinkDisabled}
              className="px-3 py-1 bg-blue-500 text-white rounded"
            >
              Crosslink Competency
            </button>
          </div>

          <div className="linked-competencies">
            <h4>Crosslinked Competencies</h4>
            <ul>
              {links.map((l, idx) => {
                const src = competencies.find((c) => c.id === l.sourceId);
                const dest = competencies.find((c) => c.id === l.destId);
                return (
                  <li key={l.id || idx} className="flex items-center gap-2">
                    {formatLabel(src)} → {formatLabel(dest)}
                    <button
                      onClick={() => setModalIndex(idx)}
                      className="text-xs bg-red-500 text-white px-2 py-0.5 rounded"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}

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
