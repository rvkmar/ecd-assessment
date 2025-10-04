import React from "react";
import CPTEditor from "./scoring/CPTEditor";

/**
 * MeasurementModelEditor (strict ECD version)
 *
 * ✅ Only supports weights at the observation or rubric-level.
 * ✅ No more observationId:constructId keys.
 * ✅ Constructs are shown read-only alongside observations.
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

  // Flatten rubric levels/criteria into rows for weighting
  const rubricRows = (rubrics || []).flatMap((r) => {
    if (Array.isArray(r.criteria) && r.criteria.length > 0) {
      return r.criteria.flatMap((c, ci) =>
        (c.levels || []).map((l, li) => ({
          id: `${r.id}:${ci}:${li}`,
          label: `${r.name || r.id} / ${c.name || c.id} / ${l.name}`,
        }))
      );
    }
    if (Array.isArray(r.levels) && r.levels.length > 0) {
      return r.levels.map((l, li) => ({
        id: `${r.id}:${li}`,
        label: `${r.name || r.id} / ${l.name}`,
      }));
    }
    return [];
  });

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
          <h4 className="font-medium mt-3">Weights</h4>
          {((observations || []).length === 0 && rubricRows.length === 0) ? (
            <p className="text-gray-500 text-sm">
              Define observations and/or rubrics first.
            </p>
          ) : (
            <table className="min-w-full border-collapse border mt-2 text-sm">
              <thead>
                <tr>
                  <th className="border px-2 py-1 bg-gray-100">Indicator</th>
                  <th className="border px-2 py-1 bg-gray-100">Weight</th>
                  <th className="border px-2 py-1 bg-gray-100">Linked Construct</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((o) => {
                  const linkedConstruct = constructs.find((c) => c.id === o.constructId);
                  return (
                    <tr key={o.id}>
                      <td className="border px-2 py-1 font-medium">
                        {o.text || o.id} ({o.scoring?.method || "no scoring"})
                      </td>
                      <td className="border px-2 py-1">
                        <input
                          type="number"
                          step="0.1"
                          value={model.weights?.[o.id] ?? 0}
                          onChange={(e) => handleWeightChange(o.id, e.target.value)}
                          className="w-20 border p-1 rounded text-sm"
                        />
                      </td>
                      <td className="border px-2 py-1 text-gray-600 text-sm">
                        {linkedConstruct ? linkedConstruct.text || linkedConstruct.id : "—"}
                      </td>
                    </tr>
                  );
                })}

                {rubricRows.map((r) => (
                  <tr key={r.id}>
                    <td className="border px-2 py-1 font-medium">{r.label}</td>
                    <td className="border px-2 py-1">
                      <input
                        type="number"
                        step="0.1"
                        value={model.weights?.[r.id] ?? 0}
                        onChange={(e) => handleWeightChange(r.id, e.target.value)}
                        className="w-20 border p-1 rounded text-sm"
                      />
                    </td>
                    <td className="border px-2 py-1 text-gray-500 text-sm">Rubric</td>
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