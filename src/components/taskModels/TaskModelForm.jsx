// src/components/taskModels/TaskModelForm.jsx
import React, { useState, useEffect } from "react";

export default function TaskModelForm({ onSave, notify }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [actions, setActions] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [evidenceModels, setEvidenceModels] = useState([]);
  const [selectedEvidenceModels, setSelectedEvidenceModels] = useState([]);
  const [expectedObservations, setExpectedObservations] = useState([]); // [{ observationId, evidenceId }]
  const [itemMappings, setItemMappings] = useState([]); // [{ itemId, observationId, evidenceId }]
  const [availableItems, setAvailableItems] = useState([]); // fetched from questions/items API

  // Load available evidence models
  useEffect(() => {
    fetch("/api/evidenceModels")
      .then((r) => r.json())
      .then((data) => setEvidenceModels(data || []));
  }, []);

  // Load available items (questions)
  useEffect(() => {
    fetch("/api/questions")
      .then((r) => r.json())
      .then((data) => setAvailableItems(data || []));
  }, []);

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
      setExpectedObservations([...expectedObservations, { observationId: obsId, evidenceId: evId }]);
    }
  };


    const handleRemoveObservation = (obsId, evId) => {
      // Remove the observation–evidence pair
      setExpectedObservations(
        expectedObservations.filter(
          (eo) => !(eo.observationId === obsId && eo.evidenceId === evId)
        )
      );

      // 🔹 Also remove any itemMappings referencing this pair
      setItemMappings(
        itemMappings.filter(
          (m) => !(m.observationId === obsId && m.evidenceId === evId)
        )
      );
    };


  const handleMappingChange = (eo, itemId) => {
    const updated = [...itemMappings];
    const idx = updated.findIndex(
      (m) => m.observationId === eo.observationId && m.evidenceId === eo.evidenceId
    );
    if (idx >= 0) {
      updated[idx].itemId = itemId;
    } else {
      updated.push({ itemId, observationId: eo.observationId, evidenceId: eo.evidenceId });
    }
    setItemMappings(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return notify("Task model name required");
    if (!description.trim()) return notify("Description required");

    const taskModel = {
      name,
      description,
      actions: actions ? actions.split(",").map((a) => a.trim()) : [],
      difficulty,
      expectedObservations,
      evidenceModelIds: selectedEvidenceModels,
      itemMappings, // 🔹 strict ECD: link items → observations/evidence
    };

    onSave(taskModel);

    // reset
    setName("");
    setDescription("");
    setActions("");
    setDifficulty("medium");
    setSelectedEvidenceModels([]);
    setExpectedObservations([]);
    setItemMappings([]);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4">
      <input
        className="border p-2 w-full mb-2"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Task model name"
      />
      <textarea
        className="border p-2 w-full mb-2"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
      />
      <input
        className="border p-2 w-full mb-2"
        value={actions}
        onChange={(e) => setActions(e.target.value)}
        placeholder="Actions (comma-separated)"
      />

      <select
        className="border p-2 w-full mb-2"
        value={difficulty}
        onChange={(e) => setDifficulty(e.target.value)}
      >
        <option value="easy">Easy</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>

      <div className="mb-2">
        <p className="text-sm mb-1">Link Evidence Models:</p>
        {evidenceModels.length > 0 ? (
          evidenceModels.map((em) => (
            <label key={em.id} className="block text-sm">
              <input
                type="checkbox"
                checked={selectedEvidenceModels.includes(em.id)}
                onChange={() => toggleEvidenceSelection(em.id)}
              />{" "}
              {em.name}
            </label>
          ))
        ) : (
          <p className="text-gray-500 text-sm">No evidence models available</p>
        )}
      </div>

      {/* Expected Observations Builder */}
      {selectedEvidenceModels.length > 0 && (
        <div className="mb-3">
          <p className="text-sm mb-1 font-medium">Expected Observations:</p>
          {selectedEvidenceModels.map((emId) => {
            const em = evidenceModels.find((em) => em.id === emId);
            if (!em) return null;
            return (
              <div key={emId} className="mb-2 p-2 border rounded">
                <p className="font-semibold">{em.name}</p>
                {em.observations?.map((obs) => (
                  <div key={obs.id} className="ml-3 mb-2">
                    <p className="text-sm">
                      Observation: {obs.description || obs.id}
                    </p>
                    <select
                      className="border p-1 text-sm"
                      onChange={(e) => handleAddObservation(obs.id, e.target.value)}
                      value=""
                    >
                      <option value="">Select evidence</option>
                      {em.evidences?.map((ev) => (
                        <option key={ev.id} value={ev.id}>
                          {ev.description || ev.id}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {expectedObservations.length > 0 && (
        <div className="mb-2">
          <p className="text-sm font-medium">Map Items to Observations/Evidence:</p>
          <ul className="list-disc ml-5 text-sm">
            {expectedObservations.map((eo, i) => (
              <li key={i}>
                Obs: <code>{eo.observationId}</code>, Ev:{" "}
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
                  onClick={() => handleRemoveObservation(eo.observationId, eo.evidenceId)}
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
        className="px-3 py-1 bg-blue-500 text-white rounded"
      >
        Save Task Model
      </button>
    </form>
  );
}
