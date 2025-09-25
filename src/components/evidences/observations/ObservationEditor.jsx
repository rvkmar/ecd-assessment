import React from "react";
import RubricEditor from "../rubrics/RubricEditor";

export default function ObservationEditor({
  constructId,
  observations,
  setObservations,
  rubrics,
  setRubrics,
  removeObservation,   // ✅ cascade-aware
}) {
  const constructObs = observations.filter(o => o.constructId === constructId);

  return (
    <div className="ml-4">
      <h5>Observations</h5>
      {constructObs.map(o => (
        <div key={o.id} className="border p-2 mb-2">
          <input
            className="border p-1"
            value={o.text}
            onChange={(e) =>
              setObservations(observations.map(oo => oo.id === o.id ? { ...oo, text: e.target.value } : oo))
            }
          />

          <button
              className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
              onClick={() => removeObservation(o.id)}   // ✅ cascade cleanup
            >
              Remove
          </button>

          <RubricEditor
            observationId={o.id}
            rubrics={rubrics}
            setRubrics={setRubrics}
            removeRubric={removeRubric}   // ✅ cascade-aware
          />
        </div>
      ))}
      <button
        onClick={() => setObservations([...observations, { id: Date.now().toString(), constructId, text: "" }])}
      >
        + Observation
      </button>
    </div>
  );
}
