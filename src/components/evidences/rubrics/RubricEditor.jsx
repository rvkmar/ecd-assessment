import React from "react";

export default function RubricEditor({ rubrics, setRubrics, observations }) {
  const addRubric = () => {
    const newRubric = {
      id: `r${Date.now()}`,
      observationId: "",
      levels: [],
    };
    setRubrics([...rubrics, newRubric]);
  };

  const updateRubric = (id, updates) => {
    setRubrics(
      rubrics.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  };

  const removeRubric = (id) => {
    setRubrics(rubrics.filter((r) => r.id !== id));
  };

  return (
    <div className="p-4 border rounded-md space-y-3">
      <h3 className="text-lg font-semibold">Rubrics</h3>

      <button
        type="button"
        onClick={addRubric}
        className="bg-green-500 text-white px-3 py-1 rounded"
      >
        + Add Rubric
      </button>

      {rubrics.length === 0 && (
        <p className="text-gray-500">No rubrics defined yet.</p>
      )}

      <ul className="space-y-3">
        {rubrics.map((r) => (
          <li key={r.id} className="p-2 border rounded space-y-2">
            {/* Observation link */}
            <div>
              <label className="block text-sm font-medium">
                Linked Observation
              </label>
              <select
                className="w-full border rounded p-2"
                value={r.observationId}
                onChange={(e) =>
                  updateRubric(r.id, { observationId: e.target.value })
                }
              >
                <option value="">Select observation</option>
                {observations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.text || o.id}
                  </option>
                ))}
              </select>
            </div>

            {/* Levels editor */}
            <div>
              <label className="block text-sm font-medium">Levels</label>
              <textarea
                className="w-full border rounded p-2"
                rows={3}
                placeholder="Enter one rubric level per line"
                value={(r.levels || []).join("\n")}
                onChange={(e) =>
                  updateRubric(r.id, {
                    levels: e.target.value.split("\n").filter(Boolean),
                  })
                }
              />
            </div>

            <button
              type="button"
              onClick={() => removeRubric(r.id)}
              className="bg-red-500 text-white px-3 py-1 rounded"
            >
              ✕ Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
