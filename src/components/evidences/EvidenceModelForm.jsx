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
