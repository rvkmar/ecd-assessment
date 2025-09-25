import React from "react";

export default function CPTEditor({ node, updateCPT }) {
  if (!node?.cpt) return null;

  const { states = ["Mastered", "NotMastered"], entries = [] } = node.cpt;

  const handleProbChange = (rowIdx, stateIdx, value) => {
    if (node.type === "evidence") return; // read-only for evidence
    const newEntries = [...entries];
    const probs = [...newEntries[rowIdx].probs];
    probs[stateIdx] = parseFloat(value) || 0;
    newEntries[rowIdx] = { ...newEntries[rowIdx], probs };
    updateCPT({ states, entries: newEntries });
  };

  const normalizeRow = (rowIdx) => {
    if (node.type === "evidence") return; // disable for evidence
    const newEntries = [...entries];
    const probs = [...newEntries[rowIdx].probs];
    const total = probs.reduce((a, b) => a + b, 0);
    if (total > 0) {
      const normalized = probs.map(p => p / total);
      newEntries[rowIdx] = { ...newEntries[rowIdx], probs: normalized };
      updateCPT({ states, entries: newEntries });
    }
  };

  // helper to regenerate CPT when node type is evidence
  const regenerateIfEvidence = () => {
    if (node.type === "evidence") {
      const parentIds = node.parents || [];
      const parentStates = parentIds.map(pid => node.parentMap?.[pid] || ["True", "False"]);
      const cartesian = (arrays) => arrays.reduce((acc, curr) => acc.flatMap(a => curr.map(c => [...a, c])), [[]]);
      const combos = cartesian(parentStates);
      // Evidence node mirrors parent state assignments as its states
      const mirroredStates = combos.map(combo => combo.join(", "));
      const newEntries = combos.map(combo => ({
        given: Object.fromEntries(parentIds.map((pid, i) => [pid, combo[i]])),
        probs: [1]
      }));
      updateCPT({ states: mirroredStates, entries: newEntries });
    }
  };

  React.useEffect(() => {
    regenerateIfEvidence();
  }, [node.type, node.parents]);

  return (
    <div className="mt-2">
      <table className="min-w-full text-xs border">
        <thead>
          <tr>
            <th className="border px-2 py-1">Parent States</th>
            {states.map((s, i) => (
              <th key={i} className="border px-2 py-1">{s}</th>
            ))}
            <th className="border px-2 py-1">Valid?</th>
            {node.type !== "evidence" && <th className="border px-2 py-1">Actions</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, rowIdx) => {
            const total = entry.probs.reduce((a, b) => a + b, 0);
            return (
              <tr key={rowIdx}>
                <td className="border px-2 py-1">
                  {Object.entries(entry.given).map(([k, v]) => `${k}=${v}`).join(", ") || "—"}
                </td>
                {states.map((s, stateIdx) => (
                  <td key={stateIdx} className="border px-2 py-1">
                    <input
                      type="number"
                      step="0.01"
                      className="w-16 border p-1"
                      value={entry.probs[stateIdx]}
                      onChange={(e) => handleProbChange(rowIdx, stateIdx, e.target.value)}
                      disabled={node.type === "evidence"}
                    />
                  </td>
                ))}
                <td className={`border px-2 py-1 ${Math.abs(total - 1) < 0.001 ? "text-green-600" : "text-red-600"}`}>
                  {total.toFixed(2)}
                </td>
                {node.type !== "evidence" && (
                  <td className="border px-2 py-1">
                    <button
                      className="px-2 py-0.5 bg-blue-500 text-white rounded text-xs"
                      onClick={() => normalizeRow(rowIdx)}
                    >
                      Normalize
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
