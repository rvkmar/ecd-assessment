import React, { useState, useEffect } from "react";

const CPTEditor = ({ node, updateCPT }) => {
  const [cpt, setCpt] = useState(node.cpt || {});

  // Helper: generate all combinations of parent states
  const generateParentCombinations = () => {
    if (!node.parents || node.parents.length === 0) return [[]];
    // For simplicity, assume parent states are {Mastered, NotMastered}
    const states = ["Mastered", "NotMastered"];
    const combine = (parents, prefix = []) => {
      if (parents.length === 0) return [prefix];
      return states.flatMap(s =>
        combine(parents.slice(1), [...prefix, `${parents[0]}=${s}`])
      );
    };
    return combine(node.parents);
  };

  const parentCombinations = generateParentCombinations();
  const nodeStates = ["Mastered", "NotMastered"]; // default, can be made dynamic later

  // Update CPT cell
  const handleChange = (rowKey, state, value) => {
    const num = parseFloat(value);
    const newCpt = {
      ...cpt,
      [rowKey]: {
        ...(cpt[rowKey] || {}),
        [state]: isNaN(num) ? 0 : num
      }
    };
    setCpt(newCpt);
    updateCPT(newCpt);
  };

  // Validation: each row should sum to 1
  const validateRow = (row) => {
    const values = nodeStates.map(s => (cpt[row] && cpt[row][s]) || 0);
    const sum = values.reduce((a, b) => a + b, 0);
    return Math.abs(sum - 1.0) < 0.001;
  };

  return (
    <div className="cpt-editor">
      <h4>CPT for {node.id}</h4>
      <table border="1" cellPadding="4" style={{ borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th>Parent States</th>
            {nodeStates.map((s, i) => (
              <th key={i}>{s}</th>
            ))}
            <th>Valid?</th>
          </tr>
        </thead>
        <tbody>
          {parentCombinations.map((combo, idx) => {
            const rowKey = combo.join(", ") || "Prior";
            return (
              <tr key={idx}>
                <td>{rowKey}</td>
                {nodeStates.map((s, j) => (
                  <td key={j}>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={(cpt[rowKey] && cpt[rowKey][s]) || ""}
                      onChange={(e) =>
                        handleChange(rowKey, s, e.target.value)
                      }
                    />
                  </td>
                ))}
                <td style={{ color: validateRow(rowKey) ? "green" : "red" }}>
                  {validateRow(rowKey) ? "✔" : "✘"}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default CPTEditor;
