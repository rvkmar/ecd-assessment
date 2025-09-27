import React, { useState, useEffect } from "react";
import EvidenceEditor from "./EvidenceEditor";
import ConstructEditor from "./constructs/ConstructEditor";
import ObservationEditor from "./observations/ObservationEditor";
import RubricEditor from "./rubrics/RubricEditor";
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

  // On save → package data in strict ECD schema
  const handleSubmit = (e) => {
    e.preventDefault();
    onSave({
      ...model,
      name,
      description,
      evidences,
      constructs,
      observations,
      rubrics,
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
      <RubricEditor
        rubrics={rubrics}
        setRubrics={setRubrics}
        observations={observations}
      />

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
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        Save Evidence Model
      </button>
    </form>
  );
}
