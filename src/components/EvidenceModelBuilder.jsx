import React, { useState, useEffect } from "react";
import Card from "./Card";
import Modal from "./Modal";
import ScoringRuleEditor from "./ScoringRuleEditor";

export default function EvidenceModelBuilder({ notify }) {
  const [models, setModels] = useState([]);
  const [name, setName] = useState("");
  const [constructText, setConstructText] = useState("");
  const [constructs, setConstructs] = useState([]);
  const [observations, setObservations] = useState([]);
  const [rubrics, setRubrics] = useState([]);
  const [scoringRule, setScoringRule] = useState({});
  const [modal, setModal] = useState({ open: false, id: null, type: null });
  const [editingModel, setEditingModel] = useState(null);
  const [competencies, setCompetencies] = useState([]);

  // Load evidence models from API
  useEffect(() => {
    fetch("/api/evidenceModels")
      .then((r) => r.json())
      .then((data) => setModels(data || []));

    // Load competencies from API
    fetch("/api/competencies")
      .then((r) => r.json())
      .then((data) => setCompetencies(data || []));
  }, []);

  const resetForm = () => {
    setName("");
    setConstructText("");
    setConstructs([]);
    setObservations([]);
    setRubrics([]);
    setScoringRule({});
    setEditingModel(null);
  };

  const addOrUpdateModel = async () => {
    if (!name.trim()) return notify("Enter model name");

    const payload = { name, constructs, observations, rubrics, scoringRule };

    let res;
    if (editingModel) {
      res = await fetch(`/api/evidenceModels/${editingModel.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      res = await fetch("/api/evidenceModels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    if (res.ok) {
      const newModel = await res.json();
      if (editingModel) {
        setModels((prev) => prev.map((m) => (m.id === newModel.id ? newModel : m)));
        notify("Evidence model updated.");
      } else {
        setModels((prev) => [...prev, newModel]);
        notify("Evidence model added.");
      }
      resetForm();
    } else {
      notify("❌ Failed to save evidence model");
    }
  };

  const removeModel = async (id) => {
    const res = await fetch(`/api/evidenceModels/${id}`, { method: "DELETE" });
    if (res.ok) {
      setModels((prev) => prev.filter((m) => m.id !== id));
      notify("Evidence model removed.");
    } else {
      notify("❌ Failed to remove evidence model");
    }
  };

  const addConstruct = () => {
    if (!constructText.trim()) return;
    setConstructs((prev) => [
      ...prev,
      { id: Date.now().toString(), text: constructText, competencyId: "" },
    ]);
    setConstructText("");
  };

  const updateConstructText = (id, text) => {
    setConstructs((prev) => prev.map((c) => (c.id === id ? { ...c, text } : c)));
  };

  const updateConstructCompetency = (id, competencyId) => {
    setConstructs((prev) => prev.map((c) => (c.id === id ? { ...c, competencyId } : c)));
  };

  const removeConstruct = (id) => {
    setConstructs((prev) => prev.filter((c) => c.id !== id));
  };

  const addObservation = () => {
    setObservations((prev) => [
      ...prev,
      { id: Date.now().toString(), text: "New observation" },
    ]);
  };

  const updateObservationText = (id, text) => {
    setObservations((prev) => prev.map((o) => (o.id === id ? { ...o, text } : o)));
  };

  const removeObservation = (id) => {
    setObservations((prev) => prev.filter((o) => o.id !== id));
    setRubrics((prev) => prev.filter((r) => r.observationId !== id));
  };

  const addRubric = () => {
    if (observations.length === 0) return notify("Add an observation first");
    setRubrics((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        observationId: observations[0].id,
        levels: ["Level 1", "Level 2"],
      },
    ]);
  };

  const updateRubricObservation = (rubricId, observationId) => {
    setRubrics((prev) =>
      prev.map((r) => (r.id === rubricId ? { ...r, observationId } : r))
    );
  };

  const updateRubricLevel = (rubricId, index, value) => {
    setRubrics((prev) =>
      prev.map((r) =>
        r.id === rubricId
          ? { ...r, levels: r.levels.map((lvl, i) => (i === index ? value : lvl)) }
          : r
      )
    );
  };

  const addRubricLevel = (rubricId) => {
    setRubrics((prev) =>
      prev.map((r) =>
        r.id === rubricId ? { ...r, levels: [...r.levels, "New level"] } : r
      )
    );
  };

  const removeRubricLevel = (rubricId, index) => {
    setRubrics((prev) =>
      prev.map((r) =>
        r.id === rubricId
          ? { ...r, levels: r.levels.filter((_, i) => i !== index) }
          : r
      )
    );
  };

  const confirmRemoveRubric = (rubricId) => {
    setModal({ open: true, id: rubricId, type: "rubric" });
  };

  const removeRubric = (rubricId) => {
    setRubrics((prev) => prev.filter((r) => r.id !== rubricId));
  };

  const startEdit = (model) => {
    setEditingModel(model);
    setName(model.name);
    setConstructs(model.constructs || []);
    setObservations(model.observations || []);
    setRubrics(model.rubrics || []);
    setScoringRule(model.scoringRule || {});
  };

  return (
    <Card title="Evidence Models">
      <div className="flex items-center gap-2 mb-2">
        <input
          className="border p-2 flex-1"
          placeholder="Evidence Model name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button
          onClick={addOrUpdateModel}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          {editingModel ? "Update Model" : "Add Model"}
        </button>
      </div>

      <div className="space-y-4">
        <div className="mb-2">
          <p className="text-sm mb-1">Constructs (linked to Competencies):</p>
          {constructs.map((c) => (
            <div key={c.id} className="text-sm mb-1 flex items-center gap-2">
              <input
                className="border p-1 flex-1"
                value={c.text}
                onChange={(e) => updateConstructText(c.id, e.target.value)}
              />
              <select
                className="border p-1"
                value={c.competencyId || ""}
                onChange={(e) => updateConstructCompetency(c.id, e.target.value)}
              >
                <option value="">-- Select Competency --</option>
                {competencies.map((comp) => (
                  <option key={comp.id} value={comp.id}>
                    {comp.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setModal({ open: true, id: c.id, type: "construct" })}
                className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
              >
                Remove
              </button>
            </div>
          ))}
          <div className="flex gap-2">
            <input
              className="border p-2 flex-1"
              placeholder="New construct"
              value={constructText}
              onChange={(e) => setConstructText(e.target.value)}
            />
            <button
              onClick={addConstruct}
              className="px-2 py-1 bg-gray-500 text-white rounded"
            >
              + Add
            </button>
          </div>
        </div>

        <div className="mb-2">
          <p className="text-sm mb-1">Observations:</p>
          {observations.map((o) => (
            <div key={o.id} className="text-sm mb-1 flex items-center gap-2">
              <input
                className="border p-1 flex-1"
                value={o.text}
                onChange={(e) => updateObservationText(o.id, e.target.value)}
              />
              <button
                onClick={() => setModal({ open: true, id: o.id, type: "observation" })}
                className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            onClick={addObservation}
            className="px-2 py-1 bg-gray-500 text-white rounded"
          >
            + Observation
          </button>
        </div>

        <div className="mb-2">
          <p className="text-sm mb-1">Rubrics:</p>
          {rubrics.map((r) => (
            <div key={r.id} className="text-sm mb-2 p-2 border rounded">
              <div className="flex items-center gap-2 mb-1">
                <select
                  className="border p-1"
                  value={r.observationId}
                  onChange={(e) => updateRubricObservation(r.id, e.target.value)}
                >
                  {observations.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.text}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => confirmRemoveRubric(r.id)}
                  className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
                >
                  Remove Rubric
                </button>
              </div>
              <div className="space-y-1">
                {r.levels.map((lvl, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="border p-1 flex-1"
                      value={lvl}
                      onChange={(e) => updateRubricLevel(r.id, i, e.target.value)}
                    />
                    <button
                      onClick={() => removeRubricLevel(r.id, i)}
                      className="px-2 py-0.5 bg-red-400 text-white rounded text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => addRubricLevel(r.id)}
                  className="px-2 py-0.5 bg-green-500 text-white rounded text-xs"
                >
                  + Level
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={addRubric}
            className="px-2 py-1 bg-purple-500 text-white rounded"
          >
            + Rubric
          </button>
        </div>

        <div className="mb-2">
          <p className="text-sm mb-1">Scoring:</p>
          <ScoringRuleEditor
            rule={scoringRule || {}}
            setRule={setScoringRule}
            rubrics={rubrics}
          />
        </div>
      </div>

      <ul className="mt-2 text-sm space-y-1">
        {models.map((m) => (
          <li key={m.id} className="flex justify-between items-center">
            <span>{m.modelLabel ? `${m.modelLabel}: ` : ""}{m.name}</span>
            <div className="flex gap-2">
              <button
                onClick={() => startEdit(m)}
                className="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs"
              >
                Edit
              </button>
              <button
                onClick={() => setModal({ open: true, id: m.id, type: "model" })}
                className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, id: null, type: null })}
        onConfirm={() => {
          const idToRemove = modal.id;
          const type = modal.type;
          setModal({ open: false, id: null, type: null });
          if (type === "model") {
            removeModel(idToRemove);
          } else if (type === "rubric") {
            removeRubric(idToRemove);
          } else if (type === "construct") {
            removeConstruct(idToRemove);
          } else if (type === "observation") {
            removeObservation(idToRemove);
          }
        }}
        title="Confirm Delete"
        message={
          modal.type === "model"
            ? "Remove this evidence model? Linked tasks and sessions will be removed."
            : modal.type === "construct"
            ? "Remove this construct?"
            : modal.type === "observation"
            ? "Remove this observation? Linked rubrics will also be removed."
            : "Remove this rubric?"
        }
      />
    </Card>
  );
}
