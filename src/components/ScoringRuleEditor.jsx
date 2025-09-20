import React from "react";
import CPTEditor from "./CPTEditor";

export default function ScoringRuleEditor({ model, editingId, updateModel }) {
  const updateRule = (rule) => {
    updateModel(model.id, () => ({ scoringRule: rule }));
  };

  const removeNode = () => {
    updateModel(model.id, (em) => ({
      bnModel: {
        ...em.bnModel,
        nodes: (em.bnModel?.nodes || []).slice(0, -1) // remove last node
      }
    }));
  };

  return (
    <div>
      <h5 className="font-semibold">Statistical Model (or) Scoring Rule</h5>
      <select
        className="border p-2 rounded"
        value={model.scoringRule}
        disabled={editingId !== model.id}
        onChange={(e) => updateRule(e.target.value)}
      >
        <option value="sum">Sum</option>
        <option value="average">Average</option>
        <option value="irt">IRT</option>
        <option value="BN">Bayesian Network</option>
      </select>

      {/* Bayesian Network Config */}
      {model.scoringRule === "BN" && (
        <div className="mt-3 border rounded p-2 bg-white">
          <h5 className="font-semibold">Bayesian Network</h5>
          <div className="flex gap-2 mb-2">
            <button
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
              onClick={() =>
                updateModel(model.id, (em) => ({
                  bnModel: {
                    ...em.bnModel,
                    nodes: [
                      ...(em.bnModel?.nodes || []),
                      { id: `Node${(em.bnModel?.nodes?.length || 0) + 1}`, type: "latent", parents: [] }
                    ]
                  }
                }))
              }
            >
              + Add Node
            </button>
            <button
              className="px-2 py-1 bg-red-500 text-white rounded text-xs"
              onClick={removeNode}
              disabled={!model.bnModel?.nodes?.length}
            >
              - Remove Node
            </button>
          </div>

          <ul className="space-y-2">
            {(model.bnModel?.nodes || []).map((node, idx) => (
              <li key={idx} className="border rounded p-2 bg-gray-50">
                <div className="flex gap-2 items-center mb-2">
                  <input
                    className="border p-1 text-sm"
                    value={node.id}
                    onChange={(e) => {
                      const updatedNodes = [...model.bnModel.nodes];
                      updatedNodes[idx] = { ...node, id: e.target.value };
                      updateModel(model.id, () => ({ bnModel: { ...model.bnModel, nodes: updatedNodes } }));
                    }}
                  />
                  <select
                    className="border p-1 text-sm"
                    value={node.type}
                    onChange={(e) => {
                      const updatedNodes = [...model.bnModel.nodes];
                      updatedNodes[idx] = { ...node, type: e.target.value };
                      updateModel(model.id, () => ({ bnModel: { ...model.bnModel, nodes: updatedNodes } }));
                    }}
                  >
                    <option value="latent">Latent</option>
                    <option value="evidence">Evidence</option>
                  </select>
                  <select
                    multiple
                    className="border p-1 text-sm"
                    value={node.parents || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, opt => opt.value);
                      const updatedNodes = [...model.bnModel.nodes];
                      updatedNodes[idx] = { ...node, parents: selected };
                      updateModel(model.id, () => ({ bnModel: { ...model.bnModel, nodes: updatedNodes } }));
                    }}
                  >
                    {(model.bnModel.nodes || [])
                      .filter((n) => n.id !== node.id)
                      .map((n, j) => (
                        <option key={j} value={n.id}>{n.id}</option>
                      ))}
                  </select>
                </div>
                <CPTEditor
                  node={node}
                  updateCPT={(newCpt) => {
                    const updatedNodes = [...model.bnModel.nodes];
                    updatedNodes[idx] = { ...node, cpt: newCpt };
                    updateModel(model.id, () => ({ bnModel: { ...model.bnModel, nodes: updatedNodes } }));
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
