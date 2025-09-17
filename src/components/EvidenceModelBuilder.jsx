import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Card from "./Card";
import Modal from "./Modal";
import { loadDB, saveDB, renumberRootEvidenceModels, buildCompetencyOptions } from "../utils/db";

export default function EvidenceModelBuilder({ notify }) {
  const [models, setModels] = useState(loadDB().evidenceModels || []);
  const [name, setName] = useState("");
  const [modal, setModal] = useState({ open: false, id: null });
  const [editingId, setEditingId] = useState(null);

  // Load competencies across all competency models
  // const competencyModels = loadDB().competencyModels || [];
  // const allCompetencies = competencyModels.flatMap((cm) => cm.competencies);

  // ✅ Load competencies with hierarchical labels
  const competencyModels = loadDB().competencyModels || [];
  const allCompetencies = buildCompetencyOptions(competencyModels);

  // For quick lookup (id → label)
  const competencyLookup = Object.fromEntries(allCompetencies.map(c => [c.id, c.label]));

  const addModel = () => {
    if (!name.trim()) return notify("Enter model name");
    const db = loadDB();
    const newModel = {
      id: uuidv4(),
      name,
      constructs: [],
      observations: [],
      scoringRule: "sum"
    };
    db.evidenceModels.push(newModel);

    // ✅ Ensure em1, em2… numbering
    renumberRootEvidenceModels(db);

    saveDB(db);
    setModels(db.evidenceModels);
    setName("");
    notify("Model added.");
  };

  const updateModel = (id, updater) => {
    const db = loadDB();
    db.evidenceModels = db.evidenceModels.map((m) =>
      m.id === id ? { ...m, ...updater(m) } : m
    );
    saveDB(db);
    setModels(db.evidenceModels);
  };

  const removeModel = (id) => {
    const db = loadDB();
    db.evidenceModels = db.evidenceModels.filter((m) => m.id !== id);
    db.tasks = db.tasks.filter((t) => t.evidenceModelId !== id);

    // ✅ Renumber after delete
    renumberRootEvidenceModels(db);

    saveDB(db);
    setModels(db.evidenceModels);
    notify("Model removed.");
  };

  const addConstruct = (id, text, linkedCompetency) => {
    if (!text.trim()) return;
    updateModel(id, (m) => ({
      constructs: [
        ...m.constructs,
        { id: uuidv4(), text, linkedCompetencyId: linkedCompetency || null }
      ]
    }));
    notify("Construct added.");
  };

  const removeConstruct = (id, constructId) => {
    updateModel(id, (m) => ({
      constructs: m.constructs.filter((c) => c.id !== constructId)
    }));
    notify("Construct removed.");
  };

  const addObservation = (id, text) => {
    if (!text.trim()) return;
    updateModel(id, (m) => ({
      observations: [...m.observations, { id: uuidv4(), text }]
    }));
    notify("Evidence Rule / Observation added.");
  };

  const removeObservation = (id, index) => {
    updateModel(id, (m) => ({
      observations: m.observations.filter((_, i) => i !== index)
    }));
    notify("Evidence Rule / Observation removed.");
  };

  // ✅ Rubric helpers moved inside component
  const addRubric = (modelId, observationId) => {
    updateModel(modelId, (m) => ({
      rubrics: [
        ...(m.rubrics || []),
        { id: uuidv4(), observationId, levels: [] }
      ]
    }));
    notify("Rubric added.");
  };

  const addRubricLevel = (modelId, rubricId, description) => {
    updateModel(modelId, (m) => ({
      rubrics: m.rubrics.map((r) =>
        r.id === rubricId
          ? {
              ...r,
              levels: [...r.levels, { level: r.levels.length + 1, description }]
            }
          : r
      )
    }));
    notify("Rubric level added.");
  };

  const removeRubric = (modelId, rubricId) => {
    updateModel(modelId, (m) => ({
      rubrics: m.rubrics.filter((r) => r.id !== rubricId)
    }));
    notify("Rubric removed.");
  };


  const updateRule = (id, rule) => {
    updateModel(id, () => ({ scoringRule: rule }));
    notify("Statistical Model / Scoring rule updated.");
  };

  return (
    <Card title="Evidence Models">
      <div className="flex gap-2 mb-3">
        <input
          className="border p-2 flex-1"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Model name"
        />
        <button
          onClick={addModel}
          className="px-3 py-1 bg-blue-500 text-white rounded"
        >
          Add
        </button>
      </div>

      <div className="space-y-4">
        {models.map((m) => (
          // <div key={m.id} className="border rounded-lg p-3 bg-gray-50 space-y-2">

          //   <div className="flex justify-between items-center">
          //     <h4 className="font-bold">{m.name}</h4>
          //     <button
          //       onClick={() => setModal({ open: true, id: m.id })}
          //       className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
          //     >
          //       Remove
          //     </button>
          //   </div>
      
            <div key={m.id} className="border rounded-lg p-3 bg-gray-50 space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-bold">
                  {m.modelLabel ? `${m.modelLabel}: ` : ""}{m.name}
                </h4>
                <div className="flex gap-2">
                  {editingId === m.id ? (
                    <button
                      onClick={() => setEditingId(null)}
                      className="px-2 py-0.5 bg-green-500 text-white rounded text-xs"
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      onClick={() => setEditingId(m.id)}
                      className="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs"
                    >
                      Edit
                    </button>
                  )}
                  <button
                    onClick={() => setModal({ open: true, id: m.id })}
                    className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
                  >
                    Remove
                  </button>
                </div>
              </div>

              {/* Constructs */}
              <div>
                <h5 className="font-semibold">Constructs</h5>
                <ul className="text-sm ml-4 space-y-1">
                  {m.constructs.map((c) => (
                    <li key={c.id} className="flex justify-between items-center gap-2">
                      <span>
                        {c.text}
                        {c.linkedCompetencyId && (
                          <span className="ml-2 text-xs text-gray-600">
                            ↔ {competencyLookup[c.linkedCompetencyId] || c.linkedCompetencyId}
                          </span>
                        )}
                      </span>

                      {editingId === m.id && (
                        <button
                          className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
                          onClick={() => removeConstruct(m.id, c.id)}
                        >
                          −
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {editingId === m.id && (
                  <ConstructInput
                    onAdd={(txt, comp) => addConstruct(m.id, txt, comp)}
                    competencies={allCompetencies}
                  />
                )}
              </div>

              {/* Observations */}
              <div>
                <h5 className="font-semibold">Evidence Rules (or) Observations</h5>
                <ul className="text-sm ml-4 space-y-1">
                  {m.observations.map((o, i) => {
                    const rubric = m.rubrics.find((r) => r.observationId === o.id);

                    return (
                      <li key={o.id || i} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span>{o.text}</span>
                          {editingId === m.id && (
                            <div className="flex gap-2">
                              <button
                                className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
                                onClick={() => removeObservation(m.id, i)}
                              >
                                −
                              </button>
                              {!rubric && (
                                <button
                                  className="px-2 py-0.5 bg-green-500 text-white rounded text-xs"
                                  onClick={() => addRubric(m.id, o.id)}
                                >
                                  Add Rubric
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Rubric block */}
                        {rubric && (
                          <div className="ml-6 border p-2 rounded bg-white">
                            <div className="flex justify-between items-center mb-1">
                              <h6 className="font-medium text-sm">Rubric</h6>
                              {editingId === m.id && (
                                <button
                                  onClick={() => removeRubric(m.id, rubric.id)}
                                  className="px-2 py-0.5 bg-red-400 text-white rounded text-xs"
                                >
                                  Remove Rubric
                                </button>
                              )}
                            </div>
                            <ul className="text-xs ml-2 space-y-1">
                              {rubric.levels.map((lvl, idx) => (
                                <li key={idx}>
                                  <b>Level {lvl.level}:</b> {lvl.description}
                                </li>
                              ))}
                            </ul>

                            {editingId === m.id && (
                              <RubricLevelInput
                                onAdd={(desc) => addRubricLevel(m.id, rubric.id, desc)}
                              />
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {editingId === m.id && (
                  <ObservationInput onAdd={(txt) => addObservation(m.id, txt)} />
                )}
              </div>

              {/* Scoring Rule */}
              <div>
                <h5 className="font-semibold">Statistical Model (or) Scoring Rule</h5>
                  <select
                    className="border p-2 rounded"
                    value={m.scoringRule}
                    disabled={editingId !== m.id}
                    onChange={(e) => updateRule(m.id, e.target.value)}
                  >
                    <option value="sum">Sum</option>
                    <option value="average">Average</option>
                    <option value="irt">IRT (R backend)</option>
                  </select>
              </div>
          </div>
         ))} 
        </div>

      {/* Delete modal */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, id: null })}
        onConfirm={() => {
          removeModel(modal.id);
          setModal({ open: false, id: null });
        }}
        title="Confirm Delete"
        message="Remove this evidence model? Linked tasks and sessions will also be removed."
      />
    </Card>
  );
}

/* ---- Helpers ---- */
function ConstructInput({ onAdd, competencies }) {
  const [val, setVal] = useState("");
  const [linked, setLinked] = useState("");

  return (
    <div className="flex gap-2 mt-1">
      <input
        className="border p-1 flex-1 text-sm"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="New construct"
      />
      <select
        className="border p-1 text-sm"
        value={linked}
        onChange={(e) => setLinked(e.target.value)}
      >
        <option value="">Link to competency</option>
        {/* {competencies.map((c, i) => (
          <option key={i} value={c}>
            {c}
          </option>
        ))} */}
        {competencies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.label}
          </option>
        ))}
      </select>
      <button
        className="px-2 bg-green-500 text-white text-xs rounded"
        onClick={() => {
          onAdd(val, linked);
          setVal("");
          setLinked("");
        }}
      >
        +
      </button>
    </div>
  );
}

function ObservationInput({ onAdd }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2 mt-1">
      <input
        className="border p-1 flex-1 text-sm"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="New Evidence Rule / Observation"
      />
      <button
        className="px-2 bg-green-500 text-white text-xs rounded"
        onClick={() => {
          onAdd(val);
          setVal("");
        }}
      >
        +
      </button>
    </div>
  );
}

// New helpers for rubrics
function RubricLevelInput({ onAdd }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2 mt-1">
      <input
        className="border p-1 flex-1 text-xs"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="New rubric level description"
      />
      <button
        className="px-2 bg-green-500 text-white text-xs rounded"
        onClick={() => {
          if (!val.trim()) return;
          onAdd(val);
          setVal("");
        }}
      >
        +
      </button>
    </div>
  );
}
