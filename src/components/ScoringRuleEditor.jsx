import React from "react";
import CPTEditor from "./CPTEditor";

export default function ScoringRuleEditor({ model, editingId, updateModel }) {
  const updateRule = (rule) => {
    updateModel(model.id, () => ({ scoringRule: rule }));
  };

  // helpers for CPT generation
  const findNodeById = (nodes, id) => nodes.find((n) => n.id === id);

  const cartesianProduct = (arrays) => {
    if (!arrays.length) return [[]];
    return arrays.reduce((acc, curr) => acc.flatMap(a => curr.map(c => [...a, c])) , [[]]);
  };

  const generateUniformCPTForNode = (nodes, node) => {
    const states = node.states || ["Mastered", "NotMastered"];
    const parentIds = node.parents || [];
    if (parentIds.length === 0) {
      const prob = 1 / states.length;
      return { states, entries: [ { given: {}, probs: states.map(() => prob) } ] };
    }
    const parentStateArrays = parentIds.map(pid => {
      const pNode = findNodeById(nodes, pid);
      return (pNode?.states || ["True", "False"]);
    });
    const combos = cartesianProduct(parentStateArrays);
    const entries = combos.map((combo) => ({
      given: Object.fromEntries(parentIds.map((pid, i) => [pid, combo[i]])),
      probs: states.map(() => 1 / states.length)
    }));
    return { states, entries };
  };

  const ensureNodeHasCPT = (nodes, idx) => {
    const updated = [...nodes];
    const node = updated[idx];
    if (!node) return nodes;
    const prevCpt = node.cpt || {};
    const newCpt = generateUniformCPTForNode(updated, node);

    // remap existing probs if states length matches, otherwise reset
    let entries;
    if (prevCpt.entries && prevCpt.states && prevCpt.states.length === node.states.length) {
      entries = prevCpt.entries.map(e => ({ ...e, probs: [...e.probs] }));
    } else {
      entries = newCpt.entries;
    }

    // always sync states in CPT
    updated[idx] = { ...node, cpt: { states: [...node.states], entries } };
    return updated;
  };

  const resetCPT = (idx) => {
    if (!window.confirm("Reset CPT to uniform distribution? This will overwrite any manual edits.")) return;
    const updatedNodes = ensureNodeHasCPT(model.bnModel.nodes, idx);
    updateModel(model.id, () => ({ bnModel: { ...model.bnModel, nodes: updatedNodes } }));
  };

  const removeNode = () => {
    updateModel(model.id, (em) => ({
      bnModel: {
        ...em.bnModel,
        nodes: (em.bnModel?.nodes || []).slice(0, -1)
      }
    }));
  };

  const addState = (idx) => {
    const updatedNodes = [...model.bnModel.nodes];
    const node = { ...updatedNodes[idx] };
    node.states = [...(node.states || []), `State${(node.states?.length || 0) + 1}`];
    updatedNodes[idx] = node;
    const withCpt = ensureNodeHasCPT(updatedNodes, idx);
    updateModel(model.id, () => ({ bnModel: { ...model.bnModel, nodes: withCpt } }));
  };

  const updateState = (idx, sIdx, value) => {
    const updatedNodes = [...model.bnModel.nodes];
    const node = { ...updatedNodes[idx] };
    const states = [...(node.states || [])];
    states[sIdx] = value;
    node.states = states;

    // force CPT state sync
    const prevCpt = node.cpt || {};
    let entries = prevCpt.entries || [];
    if (prevCpt.states && prevCpt.states.length === states.length) {
      entries = prevCpt.entries.map(e => ({ ...e, probs: [...e.probs] }));
    }

    updatedNodes[idx] = { ...node, cpt: { states: [...states], entries } };
    updateModel(model.id, () => ({ bnModel: { ...model.bnModel, nodes: updatedNodes } }));
  };

  const removeState = (idx, sIdx) => {
    const updatedNodes = [...model.bnModel.nodes];
    const node = { ...updatedNodes[idx] };
    const states = [...(node.states || [])];
    if (states.length <= 1) return;
    states.splice(sIdx, 1);
    node.states = states;
    const withCpt = ensureNodeHasCPT(updatedNodes, idx);
    updateModel(model.id, () => ({ bnModel: { ...model.bnModel, nodes: withCpt } }));
  };

  const addNode = () => {
    updateModel(model.id, (em) => {
      const nodes = [...(em.bnModel?.nodes || [])];
      const newNode = {
        id: `Node${nodes.length + 1}`,
        type: "latent",
        parents: [],
        states: ["Mastered", "NotMastered"]
      };
      const newNodes = [...nodes, newNode];
      const withCpt = ensureNodeHasCPT(newNodes, newNodes.length - 1);
      return { bnModel: { ...em.bnModel, nodes: withCpt } };
    });
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

      {model.scoringRule === "BN" && (
        <div className="mt-3 border rounded p-2 bg-white">
          <h5 className="font-semibold">Bayesian Network</h5>
          <div className="flex gap-2 mb-2">
            <button
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs"
              onClick={addNode}
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
                      if (e.target.value === "latent" && (!updatedNodes[idx].states || updatedNodes[idx].states.length === 0)) {
                        updatedNodes[idx].states = ["Mastered", "NotMastered"];
                      }
                      const withCpt = ensureNodeHasCPT(updatedNodes, idx);
                      updateModel(model.id, () => ({ bnModel: { ...model.bnModel, nodes: withCpt } }));
                    }}
                  >
                    <option value="latent">Latent</option>
                    <option value="evidence">Evidence</option>
                  </select>
                  <button
                    className="ml-2 px-2 py-0.5 bg-purple-500 text-white rounded text-xs"
                    onClick={() => resetCPT(idx)}
                  >
                    Reset CPT
                  </button>
                </div>

                {node.type === "latent" && (
                  <div className="ml-4 mb-2">
                    <h6 className="font-medium text-sm">States</h6>
                    <ul className="space-y-1">
                      {(node.states || []).map((state, sIdx) => (
                        <li key={sIdx} className="flex gap-2 items-center">
                          <input
                            className="border p-1 text-sm flex-1"
                            value={state}
                            onChange={(e) => updateState(idx, sIdx, e.target.value)}
                          />
                          <button
                            className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
                            onClick={() => removeState(idx, sIdx)}
                            disabled={(node.states || []).length <= 1}
                          >
                            −
                          </button>
                        </li>
                      ))}
                    </ul>
                    <button
                      className="mt-1 px-2 py-0.5 bg-blue-400 text-white rounded text-xs"
                      onClick={() => addState(idx)}
                    >
                      + Add State
                    </button>
                  </div>
                )}

                {(!node.states || node.states.length === 0) ? (
                  <div className="text-xs text-red-600 italic ml-4">⚠️ Define at least one state to enable CPT editor</div>
                ) : (
                  <CPTEditor
                    node={node}
                    updateCPT={(newCpt) => {
                      const updatedNodes = [...model.bnModel.nodes];
                      updatedNodes[idx] = { ...node, cpt: { ...newCpt, states: [...node.states] } };
                      updateModel(model.id, () => ({ bnModel: { ...model.bnModel, nodes: updatedNodes } }));
                    }}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
