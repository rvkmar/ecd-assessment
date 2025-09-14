import React, { useState } from "react";
import Card from "./Card";
import Modal from "./Modal";
import { loadDB, saveDB } from "../utils/db";
import { v4 as uuidv4 } from "uuid";

export default function CompetencyModelBuilder({ notify }) {
  const [models, setModels] = useState(loadDB().competencyModels || []);
  const [name, setName] = useState("");
  const [modal, setModal] = useState({ open: false, id: null });

  const addModel = () => {
    if (!name.trim()) return notify("Enter model name");
    const db = loadDB();
    const newModel = {
      id: uuidv4(),
      name,
      competencies: []
    };
    db.competencyModels = db.competencyModels || [];
    db.competencyModels.push(newModel);
    saveDB(db);
    setModels(db.competencyModels);
    setName("");
    notify("Competency Model added.");
  };

  const addCompetency = (id, comp) => {
    if (!comp.trim()) return;
    const db = loadDB();
    db.competencyModels = db.competencyModels.map((m) =>
      m.id === id ? { ...m, competencies: [...m.competencies, comp] } : m
    );
    saveDB(db);
    setModels(db.competencyModels);
    notify("Competency added.");
  };

  const removeCompetency = (id, index) => {
    const db = loadDB();
    db.competencyModels = db.competencyModels.map((m) =>
      m.id === id
        ? { ...m, competencies: m.competencies.filter((_, i) => i !== index) }
        : m
    );
    saveDB(db);
    setModels(db.competencyModels);
    notify("Competency removed.");
  };

  const removeModel = (id) => {
    const db = loadDB();
    db.competencyModels = db.competencyModels.filter((m) => m.id !== id);
    saveDB(db);
    setModels(db.competencyModels);
    notify("Competency Model removed.");
  };

  return (
    <Card title="Competency Models">
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
          <div key={m.id} className="border rounded-lg p-3 bg-gray-50 space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-bold">{m.name}</h4>
              <button
                onClick={() => setModal({ open: true, id: m.id })}
                className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
              >
                Remove
              </button>
            </div>

            {/* Competencies list */}
            <ul className="ml-4 text-sm space-y-1">
              {m.competencies.map((c, i) => (
                <li key={i} className="flex justify-between items-center">
                  <span>{c}</span>
                  <button
                    className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
                    onClick={() => removeCompetency(m.id, i)}
                  >
                    −
                  </button>
                </li>
              ))}
            </ul>

            <CompetencyInput onAdd={(txt) => addCompetency(m.id, txt)} />
          </div>
        ))}
      </div>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, id: null })}
        onConfirm={() => {
          removeModel(modal.id);
          setModal({ open: false, id: null });
        }}
        title="Confirm Delete"
        message="Remove this competency model?"
      />
    </Card>
  );
}

/* ---- helper input ---- */
function CompetencyInput({ onAdd }) {
  const [val, setVal] = useState("");
  return (
    <div className="flex gap-2 mt-1">
      <input
        className="border p-1 flex-1 text-sm"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder="New competency"
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
