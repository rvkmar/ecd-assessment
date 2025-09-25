import React, { useState, useEffect } from "react";
import ConstructEditor from "./constructs/ConstructEditor";
import ScoringRuleEditor from "./scoring/ScoringRuleEditor";

export default function EvidenceModelForm({
  editingModel,
  setEditingModel,
  competencies,
  models,
  setModels,
  notify,
}) {
  const [name, setName] = useState("");
  const [constructs, setConstructs] = useState([]);
  const [observations, setObservations] = useState([]);
  const [rubrics, setRubrics] = useState([]);
  const [scoringModel, setScoringModel] = useState({});

  useEffect(() => {
    if (editingModel) {
      setName(editingModel.name || "");
      setConstructs(editingModel.constructs || []);
      setObservations(editingModel.observations || []);
      setRubrics(editingModel.rubrics || []);
      setScoringModel(editingModel.scoringModel || {});
    }
  }, [editingModel]);

  return (
    <div>
      <h3>Evidence Model Form</h3>
      <input
        className="border p-2 w-full mb-2"
        placeholder="Model name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <ConstructEditor
        constructs={constructs}
        setConstructs={setConstructs}
        competencies={competencies}
        observations={observations}
        setObservations={setObservations}
        rubrics={rubrics}
        setRubrics={setRubrics}
        removeConstruct={removeConstruct}   // ✅ cascade-aware
        removeObservation={removeObservation} // ✅ cascade-aware
      />

      <ScoringRuleEditor
        rule={scoringModel}
        setRule={setScoringModel}
        observations={observations}
      />

      <button className="bg-blue-500 text-white px-4 py-2 rounded">
        {editingModel ? "Update" : "Add"} Model
      </button>
    </div>
  );
}

// Remove construct + cascade cleanup
const removeConstruct = (constructId) => {
  // Drop construct
  setConstructs((prev) => prev.filter((c) => c.id !== constructId));

  // Find observations tied to this construct
  const obsToRemove = observations.filter((o) => o.constructId === constructId).map((o) => o.id);

  // Drop observations
  setObservations((prev) => prev.filter((o) => !obsToRemove.includes(o.id)));

  // Drop rubrics tied to those observations
  setRubrics((prev) => prev.filter((r) => !obsToRemove.includes(r.observationId)));

  // Drop weights for those observations
  setScoringModel((prev) => ({
    ...prev,
    weights: Object.fromEntries(
      Object.entries(prev.weights || {}).filter(([obsId]) => !obsToRemove.includes(obsId))
    ),
  }));
};

// Remove observation + cascade cleanup
const removeObservation = (observationId) => {
  // Drop observation
  setObservations((prev) => prev.filter((o) => o.id !== observationId));

  // Drop rubrics tied to this observation
  setRubrics((prev) => prev.filter((r) => r.observationId !== observationId));

  // Drop weight for this observation
  setScoringModel((prev) => {
    const { [observationId]: removed, ...remaining } = prev.weights || {};
    return { ...prev, weights: remaining };
  });
};

// Remove rubric + cleanup (future-proof for rubric-level weights/scoring)
const removeRubric = (rubricId) => {
  // Drop rubric
  setRubrics((prev) => prev.filter((r) => r.id !== rubricId));

  // Drop any weights keyed by rubricId (if such exist in scoringModel)
  setScoringModel((prev) => {
    if (!prev.weights) return prev;
    const { [rubricId]: removed, ...remaining } = prev.weights;
    return { ...prev, weights: remaining };
  });
};
