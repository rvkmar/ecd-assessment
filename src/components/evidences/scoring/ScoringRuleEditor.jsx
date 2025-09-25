import React from "react";
import CPTEditor from "./CPTEditor";

export default function ScoringRuleEditor({
  rule = {},
  setRule = () => {},
  observations = [],
  rubrics = [],
}) {
  const ruleType = rule?.type || "";

  const updateRuleType = (value) => {
    setRule({
      ...(rule || {}),
      type: value,
      weights: rule.weights || {}, // ensure weights object exists
    });
  };

  const updateWeight = (id, weight) => {
    setRule({
      ...rule,
      weights: {
        ...(rule.weights || {}),
        [id]: weight,
      },
    });
  };

  const updateField = (field, value) => {
    setRule({ ...(rule || {}), [field]: value });
  };

  // Group rubrics by observationId
  const rubricsByObs = rubrics.reduce((acc, r) => {
    if (!acc[r.observationId]) acc[r.observationId] = [];
    acc[r.observationId].push(r);
    return acc;
  }, {});

  return (
    <div>
      <h3 className="text-sm mb-1">Scoring Model</h3>

      <select
        className="border p-2 rounded mb-2 w-full"
        value={ruleType}
        onChange={(e) => updateRuleType(e.target.value)}
      >
        <option value="">Select Rule Type</option>
        <option value="sum">Sum (weights by observation)</option>
        <option value="average">Average (weights by observation)</option>
        <option value="irt">IRT</option>
        <option value="BN">Bayesian Network</option>
        <option value="rubric">Rubric (weights by rubric/level)</option>
      </select>

      {/* 🔹 Observation Weights */}
      {(ruleType === "sum" || ruleType === "average") && (
        <div className="mb-2">
          <p className="text-xs text-gray-600 mb-1">Weights by Observation</p>
          {observations.map((o) => (
            <div key={o.id} className="flex items-center gap-2 mb-1">
              <span className="flex-1 text-sm">{o.text || o.id}</span>
              <input
                type="number"
                className="border p-1 w-20"
                value={rule.weights?.[o.id] || ""}
                onChange={(e) => updateWeight(o.id, parseFloat(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>
      )}

      {/* 🔹 Rubric Weights grouped by observation and level */}
      {ruleType === "rubric" && (
        <div className="mb-2">
          <p className="text-xs text-gray-600 mb-1">
            Weights by Rubric Level (grouped by observation)
          </p>
          {observations.map((o) => (
            <div key={o.id} className="mb-2 pl-2 border-l-2 border-gray-300">
              <p className="font-medium text-sm mb-1">{o.text || o.id}</p>
              {(rubricsByObs[o.id] || []).map((r) => (
                <div key={r.id} className="mb-2">
                  <p className="text-xs italic">Rubric {r.id}</p>
                  {r.levels.map((lvl, i) => {
                    const weightKey = `${r.id}:${i}`;
                    return (
                      <div key={weightKey} className="flex items-center gap-2 mb-1">
                        <span className="flex-1 text-xs">
                          {lvl} (Level {i + 1})
                        </span>
                        <input
                          type="number"
                          className="border p-1 w-20"
                          value={rule.weights?.[weightKey] || ""}
                          onChange={(e) =>
                            updateWeight(weightKey, parseFloat(e.target.value) || 0)
                          }
                        />
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* 🔹 IRT Config */}
      {ruleType === "irt" && (
        <div className="mb-2 space-y-1">
          <input
            className="border p-2 w-full"
            placeholder="Model (2PL or 3PL)"
            value={rule?.irtConfig?.model || ""}
            onChange={(e) =>
              updateField("irtConfig", { ...(rule.irtConfig || {}), model: e.target.value })
            }
          />
        </div>
      )}

      {/* 🔹 Bayesian Network Config */}
      {ruleType === "BN" && (
        <div className="mt-3 border rounded p-2 bg-white">
          <h5 className="font-semibold">Bayesian Network</h5>
          <CPTEditor
            node={{}}
            updateCPT={(newCpt) => {
              setRule({
                ...(rule || {}),
                type: "BN",
                bayesianConfig: { ...(rule.bayesianConfig || {}), CPTs: newCpt },
              });
            }}
          />
        </div>
      )}
    </div>
  );
}
