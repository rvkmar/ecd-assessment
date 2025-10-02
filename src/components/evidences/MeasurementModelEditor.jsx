import React from "react";
import CPTEditor from "./scoring/CPTEditor";

/**
 * MeasurementModelEditor (matrix view for weights including rubrics)
 *
 * Props:
 * - model: { type, weights, irtConfig?, bayesianConfig? }
 * - setModel: function to update model
 * - observations: array of observations
 * - rubrics: array of rubrics
 * - constructs: array of constructs
 */
export default function MeasurementModelEditor({ model, setModel, observations, rubrics, constructs }) {
  const handleTypeChange = (type) => {
    setModel({ ...model, type });
  };

  const handleWeightChange = (key, value) => {
    setModel({
      ...model,
      weights: { ...model.weights, [key]: parseFloat(value) || 0 },
    });
  };

  // Helper to flatten rubric levels
  const rubricRows = (rubrics || []).flatMap((r) =>
    (r.criteria || []).flatMap((c) =>
      (c.levels || []).map((l) => ({
        id: `${r.id}:${c.id}:${l.name}`,
        label: `${r.name || r.id} / ${c.name || c.id} / ${l.name}`,
      }))
    )
  );

  return (
    <div className="p-4 border rounded-md space-y-4">
      <h3 className="text-lg font-semibold">Measurement Model</h3>

      {/* Model Type Selector */}
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

      {/* Matrix View for Sum/Average */}
      {(model.type === "sum" || model.type === "average") && (
        <div>
          <h4 className="font-medium mt-3">Weights Matrix</h4>
          {((observations || []).length === 0 && rubricRows.length === 0) || (constructs || []).length === 0 ? (
            <p className="text-gray-500 text-sm">
              Define constructs and observations/rubrics first.
            </p>
          ) : (
            <table className="min-w-full border-collapse border mt-2 text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1 bg-gray-100">Evidence</th>
                  {constructs.map((c) => (
                    <th key={c.id} className="border px-2 py-1 bg-gray-100">
                      {c.name || c.id}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {observations.map((o) => (
                  <tr key={o.id}>
                    <td className="border px-2 py-1 font-medium">
                      {o.text || o.id} ({o.scoring?.method || "no scoring"})
                    </td>
                    {constructs.map((c) => (
                      <td key={c.id} className="border px-2 py-1">
                        <input
                          type="number"
                          step="0.1"
                          value={model.weights?.[`${o.id}:${c.id}`] ?? 0}
                          onChange={(e) =>
                            handleWeightChange(`${o.id}:${c.id}`, e.target.value)
                          }
                          className="w-20 border p-1 rounded text-sm"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
                {rubricRows.map((r) => (
                  <tr key={r.id}>
                    <td className="border px-2 py-1 font-medium">{r.label}</td>
                    {constructs.map((c) => (
                      <td key={c.id} className="border px-2 py-1">
                        <input
                          type="number"
                          step="0.1"
                          value={model.weights?.[`${r.id}:${c.id}`] ?? 0}
                          onChange={(e) =>
                            handleWeightChange(`${r.id}:${c.id}`, e.target.value)
                          }
                          className="w-20 border p-1 rounded text-sm"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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