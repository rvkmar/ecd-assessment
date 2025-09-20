import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import Card from "./Card";
import Modal from "./Modal";
import { loadDB, saveDB, renumberRootEvidenceModels, buildCompetencyOptions } from "../utils/db";
import ScoringRuleEditor from "./ScoringRuleEditor";

export default function EvidenceModelBuilder({ notify }) {
  const [models, setModels] = useState(loadDB().evidenceModels || []);
  const [name, setName] = useState("");
  const [modal, setModal] = useState({ open: false, id: null });
  const [editingId, setEditingId] = useState(null);
  const [confirmedIds, setConfirmedIds] = useState([]);

  const competencyModels = loadDB().competencyModels || [];
  const allCompetencies = buildCompetencyOptions(competencyModels);
  const competencyLookup = Object.fromEntries(allCompetencies.map(c => [c.id, c.label]));

  const addModel = () => {
    if (!name.trim()) return notify("Enter model name");
    const db = loadDB();
    const newModel = {
      id: uuidv4(),
      name,
      constructs: [],
      observations: [],
      rubrics: [],
      scoringRule: "sum"
    };
    db.evidenceModels.push(newModel);
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
    renumberRootEvidenceModels(db);
    saveDB(db);
    setModels(db.evidenceModels);
    notify("Model removed.");
  };

  const confirmEvidence = (id) => {
    if (!confirmedIds.includes(id)) {
      setConfirmedIds([...confirmedIds, id]);
    }
    setEditingId(null);
    notify("Evidence confirmed. Further edits disabled.");
  };

  const scoringRuleSummary = (m) => {
    if (!m.scoringRule) return "Scoring Rule: None";
    if (m.scoringRule === "sum") return "Scoring Rule: Sum";
    if (m.scoringRule === "average") return "Scoring Rule: Average";
    if (m.scoringRule === "irt") return "Scoring Rule: IRT";
    if (m.scoringRule === "bn") return "Scoring Rule: Bayesian Network";
    // if (m.scoringRule === "bn") return `Scoring Rule: Bayesian Network (${(m.bnNodes || []).length} nodes)`;
    return `Scoring Rule: ${m.scoringRule}`;
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
        {models.map((m) => {
          const isLocked = confirmedIds.includes(m.id);
          const isEditing = editingId === m.id;
          const applyLockedStyle = isLocked && !isEditing;

          return (
            <div
              key={m.id}
              className={`border rounded-lg p-3 space-y-2 ${applyLockedStyle ? "bg-gray-200 opacity-70" : "bg-gray-50"}`}
            >
              <div className="flex justify-between items-center">
                <h4 className="font-bold flex items-center gap-2">
                  {m.modelLabel ? `${m.modelLabel}: ` : ""}{m.name}
                  {applyLockedStyle && (
                    <span className="text-green-600 text-xs font-semibold flex items-center gap-1">
                      🔒 Confirmed
                    </span>
                  )}
                </h4>
                <div className="flex gap-2">
                  {isEditing ? (
                    <button
                      onClick={() => confirmEvidence(m.id)}
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
                      {isEditing && (
                        <button
                          className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
                          onClick={() => updateModel(m.id, (mm) => ({
                            constructs: mm.constructs.filter((cc) => cc.id !== c.id)
                          }))}
                        >
                          −
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {isEditing && (
                  <ConstructInput
                    onAdd={(txt, comp) => updateModel(m.id, (mm) => ({
                      constructs: [...mm.constructs, { id: uuidv4(), text: txt, linkedCompetencyId: comp || null }]
                    }))}
                    competencies={allCompetencies}
                  />
                )}
              </div>

              {/* Observations + Rubrics */}
              <div>
                <h5 className="font-semibold">Evidence Rules (or) Observations</h5>
                <ul className="text-sm ml-4 space-y-1">
                  {m.observations.map((o, i) => {
                    const rubric = (m.rubrics || []).find(r => r.observationId === o.id);
                    return (
                      <li key={o.id || i} className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span>{o.text}</span>
                          {isEditing && (
                            <div className="flex gap-2">
                              <button
                                className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
                                onClick={() => updateModel(m.id, (mm) => ({
                                  observations: mm.observations.filter((_, idx) => idx !== i)
                                }))}
                              >
                                −
                              </button>
                              {!rubric && (
                                <button
                                  className="px-2 py-0.5 bg-green-500 text-white rounded text-xs"
                                  onClick={() => updateModel(m.id, (mm) => ({
                                    rubrics: [...(mm.rubrics || []), { id: uuidv4(), observationId: o.id, levels: [] }]
                                  }))}
                                >
                                  Add Rubric
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                        {rubric && (
                          <div className="ml-6 border p-2 rounded bg-white">
                            <div className="flex justify-between items-center mb-1">
                              <h6 className="font-medium text-sm">Rubric</h6>
                              {isEditing ? (
                                <button
                                  onClick={() => updateModel(m.id, (mm) => ({
                                    rubrics: mm.rubrics.filter(r => r.id !== rubric.id)
                                  }))}
                                  className="px-2 py-0.5 bg-red-400 text-white rounded text-xs"
                                >
                                  Remove Rubric
                                </button>
                              ) : null}
                            </div>
                            <ul className="text-xs ml-2 space-y-1">
                              {rubric.levels.map((lvl, idx) => (
                                <li key={idx}>
                                  <b>Level {lvl.level}:</b> {lvl.description}
                                </li>
                              ))}
                            </ul>
                            {isEditing ? (
                              <RubricLevelInput onAdd={(desc) => updateModel(m.id, (mm) => ({
                                rubrics: mm.rubrics.map(r =>
                                  r.id === rubric.id ? { ...r, levels: [...r.levels, { level: r.levels.length + 1, description: desc }] } : r
                                )
                              }))} />
                            ) : null}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {isEditing && (
                  <ObservationInput
                    onAdd={(txt) => updateModel(m.id, (mm) => ({
                      observations: [...mm.observations, { id: uuidv4(), text: txt }]
                    }))}
                  />
                )}
              </div>

              {/* Scoring Rule */}
              {isEditing ? (
                <ScoringRuleEditor
                  model={m}
                  editingId={editingId}
                  updateModel={updateModel}
                  allowRemoveNode={true}
                />
              ) : (
                  <div>
                    <h5 className="font-semibold">Scoring Rule (or) Statistical Model</h5>
                    <ul className="text-sm ml-4 space-y-1">
                      {scoringRuleSummary(m)}
                    </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

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
        {competencies.map((c) => (
          <option key={c.id} value={c.id}>{c.label}</option>
        ))}
      </select>
      <button
        className="px-2 bg-green-500 text-white text-xs rounded"
        onClick={() => {
          if (!val.trim()) return;
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
