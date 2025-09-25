import React from "react";
import RubricEditor from "../rubrics/RubricEditor";

export default function ObservationEditor({
  constructId,
  observations,
  setObservations,
  rubrics,
  setRubrics,
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
          <RubricEditor
            observationId={o.id}
            rubrics={rubrics}
            setRubrics={setRubrics}
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
