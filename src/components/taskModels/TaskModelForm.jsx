// src/components/taskModels/TaskModelForm.jsx
import React, { useState, useEffect } from "react";

export default function TaskModelForm({ model, onSave, onCancel, notify }) {
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

  const [subTaskIds, setSubTaskIds] = useState(model?.subTaskIds || []);
  const [availableTaskModels, setAvailableTaskModels] = useState([]);

  // 🔹 Question Blueprint metadata
  const [blueprint, setBlueprint] = useState(
    model?.questionBlueprint || {
      type: "mcq",
      interaction: "click",
      layout: "single",
      mediaSupport: [],
      responseType: "selected",
      rubricModelId: "",
    }
  );

  const questionTypes = ["mcq", "msq", "open", "numeric", "image", "reading", "data", "simulation"];
  const interactions = ["click", "drag", "input", "upload"];
  const layouts = ["single", "composite", "passage_based"];
  const mediaOptions = ["image", "audio", "video", "dataset"];
  const responseTypes = ["selected", "constructed", "extended"];
  
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

  // Load task models for sub-task linking
  useEffect(() => {
    fetch("/api/taskModels")
      .then((r) => r.json())
      .then((data) => setAvailableTaskModels(data || []))
      .catch(() => setAvailableTaskModels([]));
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
      setSubTaskIds(model.subTaskIds || []);
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
      actions: Array.isArray(actions) ? actions : [],
      difficulty,
      evidenceModelIds: selectedEvidenceModels,
      expectedObservations,
      itemMappings,
      subTaskIds,
      questionBlueprint: blueprint,
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
        <label className="block font-medium">Actions </label>
        <select
          multiple
          className="border p-1 w-full rounded"
          value={actions}
          onChange={(e) =>
            setActions([...e.target.selectedOptions].map((o) => o.value))
          }
        >
          <option value="attempt_question">Answer a Question</option>
          <option value="open_response">Write an Open Response</option>
          <option value="simulation">Complete a Simulation</option>
          <option value="discussion">Join a Discussion</option>
          <option value="project_work">Work on a Project</option>
          <option value="upload_artifact">Upload a File/Artifact</option>
          <option value="performance">Perform a Task</option>
          <option value="behavior">Behavior Observation</option>
        </select>

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

      {/* Sub-Tasks */}
      <div>
        <label className="block font-medium">Sub-Tasks (Optional)</label>
        <select
          multiple
          className="border p-2 w-full rounded"
          value={subTaskIds}
          onChange={(e) =>
            setSubTaskIds([...e.target.selectedOptions].map((o) => o.value))
          }
        >
          {availableTaskModels
            .filter((t) => t.id !== model?.id)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.name || t.id}
              </option>
            ))}
        </select>
        <p className="text-xs text-gray-500 mt-1">
          Select one or more existing task models to include as sub-tasks.
        </p>
      </div>

      {/* Question Blueprint Section */ }
      <div className="border-t pt-3 mt-3">
        <h3 className="font-semibold text-lg mb-2">Question Blueprint (Item Template)</h3>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium">Question Type</label>
            <select
              className="border p-2 w-full rounded text-sm"
              value={blueprint.type}
              onChange={(e) => setBlueprint({ ...blueprint, type: e.target.value })}
            >
              {questionTypes.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Interaction</label>
            <select
              className="border p-2 w-full rounded text-sm"
              value={blueprint.interaction}
              onChange={(e) => setBlueprint({ ...blueprint, interaction: e.target.value })}
            >
              {interactions.map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Layout</label>
            <select
              className="border p-2 w-full rounded text-sm"
              value={blueprint.layout}
              onChange={(e) => setBlueprint({ ...blueprint, layout: e.target.value })}
            >
              {layouts.map((l) => (
                <option key={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium">Response Type</label>
            <select
              className="border p-2 w-full rounded text-sm"
              value={blueprint.responseType}
              onChange={(e) => setBlueprint({ ...blueprint, responseType: e.target.value })}
            >
              {responseTypes.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium">Media Support</label>
          <div className="flex flex-wrap gap-3 mt-1">
            {mediaOptions.map((m) => (
              <label key={m} className="text-sm">
                <input
                  type="checkbox"
                  checked={blueprint.mediaSupport.includes(m)}
                  onChange={(e) => {
                    const updated = e.target.checked
                      ? [...blueprint.mediaSupport, m]
                      : blueprint.mediaSupport.filter((x) => x !== m);
                    setBlueprint({ ...blueprint, mediaSupport: updated });
                  }}
                />{" "}
                {m}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-3">
          <label className="block text-sm font-medium">Rubric Model ID (optional)</label>
          <input
            type="text"
            className="border p-2 w-full rounded text-sm"
            placeholder="rubric model ID (if applicable)"
            value={blueprint.rubricModelId}
            onChange={(e) =>
              setBlueprint({ ...blueprint, rubricModelId: e.target.value })
            }
          />
        </div>
      </div>
      
      {/* Evidence model selection (show name, store ID) */ }
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
                  <select
                    className="border p-1 text-sm rounded flex-1"
                    id={`obs-${emId}`}
                  >
                    <option value="">Select indicator</option>
                    {em?.observations?.map((obs) => (
                      <option key={obs.id} value={obs.id}>
                        {obs.description || obs.text || obs.id} ({obs.id})
                      </option>
                    ))}
                  </select>
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

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Save Activity Template
        </button>
      </div>
    </form>
  );
}
