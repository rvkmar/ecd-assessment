// src/components/taskModels/TaskModelForm.jsx
import React, { useState, useEffect } from "react";

export default function TaskModelForm({ model, onSave, notify }) {
  const [name, setName] = useState(model?.name || "");
  const [description, setDescription] = useState(model?.description || "");
  const [actions, setActions] = useState(model?.actions?.join(", ") || "");
  const [difficulty, setDifficulty] = useState(model?.difficulty || "medium");
  const [evidenceModels, setEvidenceModels] = useState([]);
  const [selectedEvidenceModels, setSelectedEvidenceModels] = useState(
    model?.evidenceModelIds || []
  );
  const [expectedObservations, setExpectedObservations] = useState(
    model?.expectedObservations || []
  );
  const [itemMappings, setItemMappings] = useState(model?.itemMappings || []);
  const [availableItems, setAvailableItems] = useState([]);

  // Load evidence models
  useEffect(() => {
    fetch("/api/evidenceModels")
      .then((r) => r.json())
      .then((data) => setEvidenceModels(data || []));
  }, []);

  // Load items (questions)
  useEffect(() => {
    fetch("/api/questions")
      .then((r) => r.json())
      .then((data) => setAvailableItems(data || []));
  }, []);

  // Reset form when model changes
  useEffect(() => {
    if (model) {
      setName(model.name || "");
      setDescription(model.description || "");
      setActions(model.actions?.join(", ") || "");
      setDifficulty(model.difficulty || "medium");
      setSelectedEvidenceModels(model.evidenceModelIds || []);
      setExpectedObservations(model.expectedObservations || []);
      setItemMappings(model.itemMappings || []);
    }
  }, [model]);

  const toggleEvidenceSelection = (id) => {
    setSelectedEvidenceModels((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    setExpectedObservations([]);
    setItemMappings([]);
  };

  const handleAddObservation = (obsId, evId) => {
    if (!obsId || !evId) return;
    const exists = expectedObservations.some(
      (eo) => eo.observationId === obsId && eo.evidenceId === evId
    );
    if (!exists) {
      setExpectedObservations([
        ...expectedObservations,
        { observationId: obsId, evidenceId: evId },
      ]);
    }
  };

  const handleRemoveObservation = (obsId, evId) => {
    setExpectedObservations(
      expectedObservations.filter(
        (eo) => !(eo.observationId === obsId && eo.evidenceId === evId)
      )
    );
    setItemMappings(
      itemMappings.filter(
        (m) => !(m.observationId === obsId && m.evidenceId === evId)
      )
    );
  };

  const handleMappingChange = (eo, itemId) => {
    const updated = [...itemMappings];
    const idx = updated.findIndex(
      (m) =>
        m.observationId === eo.observationId && m.evidenceId === eo.evidenceId
    );
    if (idx >= 0) {
      updated[idx].itemId = itemId;
    } else {
      updated.push({
        itemId,
        observationId: eo.observationId,
        evidenceId: eo.evidenceId,
      });
    }
    setItemMappings(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return notify?.("Activity template name required");
    if (!description.trim()) return notify?.("Description required");

    const taskModel = {
      ...model,
      name,
      description,
      actions: actions
        ? actions.split(",").map((a) => a.trim())
        : [],
      difficulty,
      evidenceModelIds: selectedEvidenceModels,
      expectedObservations,
      itemMappings,
    };

    onSave(taskModel);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Metadata */}
      <div>
        <label className="block font-medium">Activity Template Name</label>
        <input
          className="border p-2 w-full rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Activity template name"
        />
      </div>

      <div>
        <label className="block font-medium">Description</label>
        <textarea
          className="border p-2 w-full rounded"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
        />
      </div>

      <div>
        <label className="block font-medium">Actions (comma-separated)</label>
        <input
          className="border p-2 w-full rounded"
          value={actions}
          onChange={(e) => setActions(e.target.value)}
        />
      </div>

      <div>
        <label className="block font-medium">Difficulty</label>
        <select
          className="border p-2 w-full rounded"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
      </div>

      {/* Evidence model selection (show name, store ID) */}
      <div>
        <p className="font-medium text-sm">Link Evidence Rules:</p>
        {evidenceModels.length > 0 ? (
          evidenceModels.map((em) => (
            <label key={em.id} className="block text-sm">
              <input
                type="checkbox"
                checked={selectedEvidenceModels.includes(em.id)}
                onChange={() => toggleEvidenceSelection(em.id)}
              />{" "}
              {em.name || em.id} <span className="text-gray-400">({em.id})</span>
            </label>
          ))
        ) : (
          <p className="text-gray-500 text-sm">No evidence rules available</p>
        )}
      </div>

      {/* Expected observations */}
      {selectedEvidenceModels.length > 0 && (
        <div>
          <p className="font-medium text-sm">Expected Indicators</p>
          {selectedEvidenceModels.map((emId) => {
            const em = evidenceModels.find((em) => em.id === emId);
            return (
              <div key={emId} className="p-2 border rounded mt-2">
                <p className="font-semibold">
                  Evidence Rule: {em?.name || emId}{" "}
                  <span className="text-gray-400">({emId})</span>
                </p>
                <div className="flex space-x-2 mt-1">
                  <input
                    type="text"
                    className="border p-1 text-sm rounded flex-1"
                    placeholder="Indicator ID"
                    id={`obs-${emId}`}
                  />
                  <select
                    className="border p-1 text-sm rounded flex-1"
                    id={`ev-${emId}`}
                  >
                    <option value="">Select evidence</option>
                    {em?.evidences?.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.description || ev.id} ({ev.id})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
                    onClick={() =>
                      handleAddObservation(
                        document.getElementById(`obs-${emId}`).value,
                        document.getElementById(`ev-${emId}`).value
                      )
                    }
                  >
                    Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Item mappings */}
      {expectedObservations.length > 0 && (
        <div>
          <p className="font-medium text-sm">
            Map Items to Indicators/Evidence
          </p>
          <ul className="list-disc ml-5 text-sm">
            {expectedObservations.map((eo, i) => (
              <li key={i}>
                Ind: <code>{eo.observationId}</code>, Ev:{" "}
                <code>{eo.evidenceId}</code>
                <select
                  className="ml-2 border p-1 text-sm"
                  onChange={(e) => handleMappingChange(eo, e.target.value)}
                  value={
                    itemMappings.find(
                      (m) =>
                        m.observationId === eo.observationId &&
                        m.evidenceId === eo.evidenceId
                    )?.itemId || ""
                  }
                >
                  <option value="">Select Item</option>
                  {availableItems.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.stem ? item.stem.slice(0, 40) : item.id}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() =>
                    handleRemoveObservation(eo.observationId, eo.evidenceId)
                  }
                  className="ml-2 text-red-500 text-xs"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        Save Activity Template
      </button>
    </form>
  );
}
