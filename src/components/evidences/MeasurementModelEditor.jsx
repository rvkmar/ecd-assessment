import React from "react";
import CPTEditor from "./scoring/CPTEditor";

/**
 * MeasurementModelEditor (strict ECD-aligned, with backend placeholders)
 *
 * Props:
 * - model: { type, weights, irtConfig?, bayesianConfig? }
 * - setModel: function to update model
 * - observations: array of observations
 * - rubrics: array of rubrics
 */
export default function MeasurementModelEditor({ model, setModel, observations, rubrics }) {
  const handleTypeChange = (type) => {
    setModel({ ...model, type });
  };

  const handleWeightChange = (id, value) => {
    setModel({
      ...model,
      weights: { ...model.weights, [id]: parseFloat(value) || 0 },
    });
  };

  // Items that can have weights in sum/average models
  const weightItems = [
    ...observations.map((o) => ({ id: o.id, label: `Obs: ${o.text}` })),
    ...rubrics.map((r) => ({ id: r.id, label: `Rubric: ${r.name || r.id}` })),
  ];

  return (
    <div className="p-4 border rounded-md space-y-4">
      <h3 className="text-lg font-semibold">Measurement Model</h3>

      {/* Model Type Selector (radio buttons grouped by category) */}
      <div className="space-y-3">
        <fieldset>
          <legend className="font-medium">Simple Aggregation</legend>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="measurementType"
              value="sum"
              checked={model.type === "sum"}
              onChange={() => handleTypeChange("sum")}
            />
            <span>Sum</span>
          </label>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="measurementType"
              value="average"
              checked={model.type === "average"}
              onChange={() => handleTypeChange("average")}
            />
            <span>Average</span>
          </label>
        </fieldset>

        <fieldset>
          <legend className="font-medium">Parametric</legend>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="measurementType"
              value="irt"
              checked={model.type === "irt"}
              onChange={() => handleTypeChange("irt")}
            />
            <span>Item Response Theory (IRT)</span>
          </label>
        </fieldset>

        <fieldset>
          <legend className="font-medium">Probabilistic</legend>
          <label className="flex items-center space-x-2">
            <input
              type="radio"
              name="measurementType"
              value="BN"
              checked={model.type === "BN"}
              onChange={() => handleTypeChange("BN")}
            />
            <span>Bayesian Network (BN)</span>
          </label>
        </fieldset>
      </div>

      {/* Config sections based on type */}
      {/* Weights for Sum/Average */}
      {(model.type === "sum" || model.type === "average") && (
        <div>
          <h4 className="font-medium mt-3">Weights</h4>
          {weightItems.length === 0 ? (
            <p className="text-gray-500 text-sm">
              No observations or rubrics defined yet. Add them before assigning weights.
            </p>
          ) : (
            <ul className="space-y-2">
              {weightItems.map((item) => (
                <li key={item.id} className="flex items-center space-x-2">
                  <label className="flex-1">{item.label}</label>
                  <input
                    type="number"
                    step="0.1"
                    value={model.weights?.[item.id] ?? 0}
                    onChange={(e) => handleWeightChange(item.id, e.target.value)}
                    className="w-24 border p-1 rounded"
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* IRT Config Placeholder */}
      {model.type === "irt" && (
        <div className="space-y-2">
          <h4 className="font-medium mt-3">IRT Config</h4>
          <p className="text-gray-500 text-sm">
            Parameters (a, b, c) will be <strong>estimated automatically</strong>.
            You may override them manually here if needed for testing.
          </p>
          {/* Future extension: input fields/sliders for manual override */}
        </div>
      )}

      {/* Bayesian Network Config */}
      {model.type === "BN" && (
        <div>
          <h4 className="font-medium mt-3">Bayesian Network</h4>
          <p className="text-gray-500 text-sm mb-2">
            Conditional probability tables (CPTs) will be <strong>estimated by the backend</strong>.
            You may edit them manually here for prototyping.
          </p>
          <CPTEditor model={model} setModel={setModel} observations={observations} />
        </div>
      )}
    </div>
  );
}
