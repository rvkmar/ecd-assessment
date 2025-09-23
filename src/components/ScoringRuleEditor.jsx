import React from "react";
import CPTEditor from "./CPTEditor";

export default function ScoringRuleEditor({ rule = {}, setRule = () => {}, rubrics = [] }) {
  // Normalize: string (old) or object (new)
  const ruleType =
    typeof rule === "string"
      ? rule
      : rule?.type || "";

  const updateRule = (value) => {
    if (typeof rule === "string") {
      setRule(value);
    } else {
      setRule({ ...(rule || {}), type: value });
    }
  };

  const updateField = (field, value) => {
    if (typeof rule === "string") return; // ignore for old style
    setRule({ ...(rule || {}), [field]: value });
  };

  return (
    <div>
      <h3 className="text-sm mb1">Statistical Model (or) Scoring Rule</h3>
      <select
        className="border p-2 rounded mb-2"
        value={ruleType}
        onChange={(e) => updateRule(e.target.value)}
      >
        <option value="">Select Rule Type</option>
        <option value="sum">Sum</option>
        <option value="average">Average</option>
        <option value="irt">IRT</option>
        <option value="rubric">Rubric</option>
        <option value="BN">Bayesian Network</option>
      </select>

      {ruleType === "sum" && (
        <div className="mb-2">
          <input
            className="border p-2 w-full"
            placeholder="Weight (optional)"
            value={rule?.weight || ""}
            onChange={(e) => updateField("weight", e.target.value)}
          />
        </div>
      )}

      {ruleType === "average" && (
        <div className="mb-2">
          <input
            className="border p-2 w-full"
            placeholder="Weight (optional)"
            value={rule?.weight || ""}
            onChange={(e) => updateField("weight", e.target.value)}
          />
        </div>
      )}

      {ruleType === "irt" && (
        <div className="mb-2 space-y-1">
          <input
            className="border p-2 w-full"
            placeholder="Discrimination (a)"
            value={rule?.a || ""}
            onChange={(e) => updateField("a", e.target.value)}
          />
          <input
            className="border p-2 w-full"
            placeholder="Difficulty (b)"
            value={rule?.b || ""}
            onChange={(e) => updateField("b", e.target.value)}
          />
        </div>
      )}

      {ruleType === "rubric" && (
        <div className="mb-2 space-y-1">
          <select
            className="border p-2 w-full"
            value={rule?.rubricId || ""}
            onChange={(e) => updateField("rubricId", e.target.value)}
          >
            <option value="">Select Rubric</option>
            {rubrics.map((r) => (
              <option key={r.id} value={r.id}>
                {r.observationId} → Levels: {r.levels.join(", ")}
              </option>
            ))}
          </select>
          <input
            className="border p-2 w-full"
            placeholder="Rubric weight (optional)"
            value={rule?.weight || ""}
            onChange={(e) => updateField("weight", e.target.value)}
          />
        </div>
      )}

      {ruleType === "BN" && (
        <div className="mt-3 border rounded p-2 bg-white">
          <h5 className="font-semibold">Bayesian Network</h5>
          <CPTEditor
            node={{}}
            updateCPT={(newCpt) => {
              if (typeof setRule === "function") {
                setRule({
                  ...(typeof rule === "object" ? rule : {}),
                  type: "BN",
                  cpts: newCpt,
                });
              }
            }}
          />
        </div>
      )}
    </div>
  );
}
