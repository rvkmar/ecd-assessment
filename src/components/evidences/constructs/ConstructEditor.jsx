import React, { useState, useEffect } from "react";

export default function ConstructEditor({ constructs, setConstructs, evidences }) {
  const [competencyModels, setCompetencyModels] = useState([]);

  useEffect(() => {
    // Fetch competency models from backend
    fetch("/api/competencies")
      .then((res) => res.json())
      .then((data) => setCompetencyModels(data || []))
      .catch(() => setCompetencyModels([]));
  }, []);

  const addConstruct = () => {
    const newConstruct = {
      id: `c${Date.now()}`,
      text: "",
      competencyId: "",
      evidenceId: "",
    };
    setConstructs([...constructs, newConstruct]);
  };

  const updateConstruct = (id, updates) => {
    setConstructs(
      constructs.map((c) =>
        c.id === id ? { ...c, ...updates } : c
      )
    );
  };

  const removeConstruct = (id) => {
    setConstructs(constructs.filter((c) => c.id !== id));
  };

  return (
    <div className="p-4 border rounded-md space-y-3">
      <h3 className="text-lg font-semibold">Constructs</h3>

      <button
        type="button"
        onClick={addConstruct}
        className="bg-green-500 text-white px-3 py-1 rounded"
      >
        + Add Construct
      </button>

      {constructs.length === 0 && (
        <p className="text-gray-500">No constructs added yet.</p>
      )}

      <ul className="space-y-3">
        {constructs.map((c) => (
          <li key={c.id} className="p-2 border rounded space-y-2">
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Construct description"
              value={c.text}
              onChange={(e) =>
                updateConstruct(c.id, { text: e.target.value })
              }
            />

            {/* Competency dropdown */}
            <div>
              <label className="block text-sm font-medium">Competency</label>
              <select
                className="w-full border rounded p-2"
                value={c.competencyId}
                onChange={(e) =>
                  updateConstruct(c.id, { competencyId: e.target.value })
                }
              >
                <option value="">Select competency</option>
                {competencyModels.map((cm) => (
                  <option key={cm.id} value={cm.id}>
                    {cm.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Evidence dropdown */}
            <div>
              <label className="block text-sm font-medium">Evidence</label>
              <select
                className="w-full border rounded p-2"
                value={c.evidenceId}
                onChange={(e) =>
                  updateConstruct(c.id, { evidenceId: e.target.value })
                }
              >
                <option value="">Select evidence</option>
                {evidences.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.description}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => removeConstruct(c.id)}
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
