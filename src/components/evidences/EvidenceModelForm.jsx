import React, { useState, useEffect } from "react";
import EvidenceEditor from "./EvidenceEditor";
import ConstructEditor from "./constructs/ConstructEditor";
import ObservationEditor from "./observations/ObservationEditor";
import RubricManager from "./RubricManager";
import MeasurementModelEditor from "./MeasurementModelEditor";

export default function EvidenceModelForm({ model, onSave }) {
  const [name, setName] = useState(model?.name || "");
  const [description, setDescription] = useState(model?.description || "");
  const [evidences, setEvidences] = useState(model?.evidences || []);
  const [constructs, setConstructs] = useState(model?.constructs || []);
  const [observations, setObservations] = useState(model?.observations || []);
  const [rubrics, setRubrics] = useState(model?.rubrics || []);
  const [measurementModel, setMeasurementModel] = useState(
    model?.measurementModel || { type: "sum", weights: {} }
  );

  // Normalize rubrics for backend schema (flatten levels into strings but preserve full object)
  const normalizeRubrics = (rubrics) => {
    return rubrics.map((r) => ({
      ...r,
      levels: r.criteria
        ? r.criteria.flatMap((c) => c.levels.map((l) => l.name))
        : r.levels || [],
    }));
  };

  // On save → package data in strict ECD schema
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...(model.id ? { id: model.id } : {}),
      name: name.trim(),
      description: description.trim(),
      evidences,
      constructs,
      observations,
      rubrics: normalizeRubrics(rubrics),
      measurementModel,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Metadata */}
      <div>
        <label className="block font-medium">Model Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded p-2"
        />
      </div>

      <div>
        <label className="block font-medium">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded p-2"
          rows={2}
        />
      </div>

      {/* Evidences */}
      <EvidenceEditor evidences={evidences} setEvidences={setEvidences} />

      {/* Constructs */}
      <ConstructEditor
        constructs={constructs}
        setConstructs={setConstructs}
        evidences={evidences}
      />

      {/* Observations */}
      <ObservationEditor
        observations={observations}
        setObservations={setObservations}
        constructs={constructs}
      />

      {/* Rubrics */}
      <div className="p-4 border rounded-md space-y-3">
        <h3 className="text-lg font-semibold">Rubrics</h3>
        {rubrics.map((r, idx) => (
          <RubricManager
            key={r.id || idx}
            value={r}
            observations={observations}
            onChange={(updated) => {
              const newList = rubrics.map((rb) =>
                rb.id === updated.id ? updated : rb
              );
              setRubrics(newList);
            }}
            onSave={(updated) => {
              const newList = rubrics.map((rb) =>
                rb.id === updated.id ? updated : rb
              );
              setRubrics(newList);
            }}
          />
        ))}
        <button
          type="button"
          onClick={() =>
            setRubrics([
              ...rubrics,
              {
                id: `r${Date.now()}`,
                observationId: "",
                name: "New Rubric",
                description: "",
                criteria: [],
                metadata: {},
              },
            ])
          }
          className="bg-green-600 text-white px-3 py-1 rounded"
        >
          + Add Rubric
        </button>
      </div>

      {/* Measurement Model */}
      <MeasurementModelEditor
        model={measurementModel}
        setModel={setMeasurementModel}
        observations={observations}
        rubrics={rubrics}
      />

      {/* Save */}
      <button
        type="submit"
        disabled={!name.trim()}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Save Evidence Model
      </button>
    </form>
  );
}
