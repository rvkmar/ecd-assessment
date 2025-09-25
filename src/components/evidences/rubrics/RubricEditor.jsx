import React from "react";

export default function RubricEditor({ observationId, rubrics, setRubrics }) {
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
          <button
            onClick={() =>
              setRubrics(rubrics.map(rr =>
                rr.id === r.id ? { ...rr, levels: [...rr.levels, "New level"] } : rr
              ))
            }
          >
            + Level
          </button>
        </div>
      ))}
      <button
        onClick={() => setRubrics([...rubrics, { id: Date.now().toString(), observationId, levels: ["Level 1", "Level 2"] }])}
      >
        + Rubric
      </button>
    </div>
  );
}
