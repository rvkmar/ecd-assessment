import React, { useState, useEffect } from "react";

export default function ObservationEditor({ observations, setObservations, constructs }) {
  const [questions, setQuestions] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [models, setModels] = useState([]);

  useEffect(() => {
    // Fetch available questions
    fetch("/api/questions")
      .then((res) => res.json())
      .then((data) => setQuestions(data || []))
      .catch(() => setQuestions([]));

    // Fetch competencies + models for context
    Promise.all([
      fetch("/api/competencies").then((res) => res.json()),
      fetch("/api/competencies/models").then((res) => res.json()),
    ])
      .then(([comps, mods]) => {
        setCompetencies(comps || []);
        setModels(mods || []);
      })
      .catch(() => {
        setCompetencies([]);
        setModels([]);
      });
  }, []);

  const addObservation = () => {
    const newObs = {
      id: `o${Date.now()}`,
      text: "",
      constructId: "",
      type: "generic",
      linkedQuestionIds: [],
      rubric: null,
    };
    setObservations([...observations, newObs]);
  };

  const updateObservation = (id, updates) => {
    setObservations(
      observations.map((o) => (o.id === id ? { ...o, ...updates } : o))
    );
  };

  const removeObservation = (id) => {
    setObservations(observations.filter((o) => o.id !== id));
  };

  // helpers
  const getCompetency = (competencyId) =>
    competencies.find((c) => c.id === competencyId);
  const getModelName = (modelId) =>
    models.find((m) => m.id === modelId)?.name || "Unknown Model";

  return (
    <div className="p-4 border rounded-md space-y-3">
      <h3 className="text-lg font-semibold">Observations</h3>

      <button
        type="button"
        onClick={addObservation}
        className="bg-green-500 text-white px-3 py-1 rounded"
      >
        + Add Observation
      </button>

      {observations.length === 0 && (
        <p className="text-gray-500">No observations added yet.</p>
      )}

      <ul className="space-y-3">
        {observations.map((o) => (
          <li key={o.id} className="p-2 border rounded space-y-2">
            {/* Description */}
            <input
              type="text"
              className="w-full border rounded p-2"
              placeholder="Observation description"
              value={o.text}
              onChange={(e) =>
                updateObservation(o.id, { text: e.target.value })
              }
            />

            {/* Construct dropdown */}
            <div>
              <label className="block text-sm font-medium">Linked Construct</label>
              <select
                className="w-full border rounded p-2"
                value={o.constructId}
                onChange={(e) =>
                  updateObservation(o.id, { constructId: e.target.value })
                }
              >
                <option value="">Select construct</option>
                {constructs.map((c) => {
                  const comp = getCompetency(c.competencyId);
                  const modelName = comp ? getModelName(comp.modelId) : null;
                  return (
                    <option key={c.id} value={c.id}>
                      {c.text || c.id}
                      {comp ? ` → ${comp.name} (${modelName})` : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Type selector */}
            <div>
              <label className="block text-sm font-medium">Type</label>
              <select
                className="w-full border rounded p-2"
                value={o.type}
                onChange={(e) =>
                  updateObservation(o.id, { type: e.target.value })
                }
              >
                <option value="generic">Generic</option>
                <option value="rubric">Rubric</option>
              </select>
            </div>

            {/* Linked questions */}
            <div>
              <label className="block text-sm font-medium">Linked Questions</label>
              <select
                multiple
                className="w-full border rounded p-2 h-28"
                value={o.linkedQuestionIds}
                onChange={(e) =>
                  updateObservation(o.id, {
                    linkedQuestionIds: Array.from(
                      e.target.selectedOptions,
                      (opt) => opt.value
                    ),
                  })
                }
              >
                {questions.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.stem || q.text || q.id}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500">
                Hold Ctrl (Windows) or Cmd (Mac) to select multiple questions.
              </p>
            </div>

            {/* Rubric editor inline */}
            {o.type === "rubric" && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Rubric Levels</label>
                <textarea
                  className="w-full border rounded p-2"
                  rows={3}
                  placeholder="Enter rubric levels, one per line"
                  value={(o.rubric?.levels || []).join("\n")}
                  onChange={(e) =>
                    updateObservation(o.id, {
                      rubric: {
                        levels: e.target.value.split("\n").filter(Boolean),
                      },
                    })
                  }
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => removeObservation(o.id)}
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
