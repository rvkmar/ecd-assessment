import React from "react";
import ObservationEditor from "../observations/ObservationEditor";

export default function ConstructEditor({
  constructs,
  setConstructs,
  competencies,
  observations,
  setObservations,
  rubrics,
  setRubrics,
}) {
  return (
    <div>
      <h4>Constructs</h4>
      {constructs.map((c) => (
        <div key={c.id} className="border p-2 mb-2">
          <input
            className="border p-1"
            value={c.text}
            onChange={(e) =>
              setConstructs(constructs.map(cc => cc.id === c.id ? { ...cc, text: e.target.value } : cc))
            }
          />
          <select
            className="border p-1 ml-2"
            value={c.competencyId}
            onChange={(e) =>
              setConstructs(constructs.map(cc => cc.id === c.id ? { ...cc, competencyId: e.target.value } : cc))
            }
          >
            <option value="">Select competency</option>
            {competencies.map(comp => (
              <option key={comp.id} value={comp.id}>{comp.name}</option>
            ))}
          </select>

          <ObservationEditor
            constructId={c.id}
            observations={observations}
            setObservations={setObservations}
            rubrics={rubrics}
            setRubrics={setRubrics}
          />
        </div>
      ))}
      <button onClick={() => setConstructs([...constructs, { id: Date.now().toString(), text: "", competencyId: "" }])}>
        + Construct
      </button>
    </div>
  );
}
