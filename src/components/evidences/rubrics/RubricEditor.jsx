import React from "react";

export default function RubricEditor({ observationId, rubrics, setRubrics, removeRubric }) {
  const obsRubrics = rubrics.filter(r => r.observationId === observationId);

  return (
    <div className="ml-4">
      <h6>Rubrics</h6>
      {obsRubrics.map(r => (
        <div key={r.id} className="border p-2 mb-2">
          {r.levels.map((lvl, i) => (
            <input
              key={i}
              className="border p-1 block mb-1"
              value={lvl}
              onChange={(e) =>
                setRubrics(rubrics.map(rr =>
                  rr.id === r.id
                    ? { ...rr, levels: rr.levels.map((l, j) => j === i ? e.target.value : l) }
                    : rr
                ))
              }
            />
          ))}

          <div className="flex gap-2 mt-1">
            <button
              className="px-2 py-0.5 bg-green-500 text-white rounded text-xs"
              onClick={() =>
                setRubrics(rubrics.map(rr =>
                  rr.id === r.id ? { ...rr, levels: [...rr.levels, "New level"] } : rr
                ))
              }
            >
              + Level
            </button>
            <button
              className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
              onClick={() => removeRubric(r.id)}   // ✅ cascade cleanup
            >
              Remove Rubric
            </button>
          </div>
        </div>
      ))}

      <button
        className="px-2 py-1 bg-purple-500 text-white rounded text-xs"
        onClick={() =>
          setRubrics([
            ...rubrics,
            { id: Date.now().toString(), observationId, levels: ["Level 1", "Level 2"] }
          ])
        }
      >
        + Rubric
      </button>
    </div>
  );
}
