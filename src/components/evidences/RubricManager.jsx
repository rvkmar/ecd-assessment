import React, { useEffect, useState } from "react";

// RubricManager.jsx
// A district-level Rubric editor for strict ECD Evidence Models.
// Props:
// - value: (optional) existing rubric object to edit
// - observations: [{id, name}] list to choose linked observation
// - onChange(rubric): called when rubric is updated
// - onSave(): optional callback when user explicitly saves
// - readOnly: optional boolean to render preview-only

export default function RubricManager({ value = null, observations = [], onChange = () => {}, onSave = null, readOnly = false }) {
  const blankLevel = () => ({ id: `lvl_${Math.random().toString(36).slice(2, 9)}`, name: "New level", descriptor: "Describe this level", score: 1 });
  const blankCriterion = () => ({ id: `crit_${Math.random().toString(36).slice(2, 9)}`, name: "Criterion", levels: [blankLevel()] });

  const [rubric, setRubric] = useState(() => value || {
    id: `rub_${Math.random().toString(36).slice(2,9)}`,
    observationId: observations?.[0]?.id || "",
    name: "New Rubric",
    description: "",
    criteria: [blankCriterion()],
    metadata: {},
  });

  // Keep local state in sync if value changes from outside
  useEffect(() => {
    if (value) setRubric(value);
  }, [value]);

  // Notify parent on change
  useEffect(() => {
    onChange(rubric);
  }, [rubric]);

  // --- Handlers ---
  const updateField = (k, v) => setRubric((r) => ({ ...r, [k]: v }));

  const addCriterion = () => setRubric((r) => ({ ...r, criteria: [...(r.criteria || []), blankCriterion()] }));
  const removeCriterion = (critId) => setRubric((r) => ({ ...r, criteria: (r.criteria || []).filter((c) => c.id !== critId) }));
  const updateCriterion = (critId, patch) => setRubric((r) => ({ ...r, criteria: (r.criteria || []).map((c) => c.id === critId ? { ...c, ...patch } : c) }));

  const addLevel = (critId) => updateCriterion(critId, { levels: [...(rubric.criteria.find((c) => c.id === critId).levels || []), blankLevel()] });
  const removeLevel = (critId, lvlId) => updateCriterion(critId, { levels: (rubric.criteria.find((c) => c.id === critId).levels || []).filter((l) => l.id !== lvlId) });
  const updateLevel = (critId, lvlId, patch) => {
    updateCriterion(critId, {
      levels: (rubric.criteria.find((c) => c.id === critId).levels || []).map((l) => l.id === lvlId ? { ...l, ...patch } : l),
    });
  };

  const moveCriterion = (index, dir) => {
    const arr = [...rubric.criteria];
    const swap = dir === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= arr.length) return;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    setRubric((r) => ({ ...r, criteria: arr }));
  };

  const moveLevel = (critId, index, dir) => {
    const crit = rubric.criteria.find((c) => c.id === critId);
    if (!crit) return;
    const arr = [...crit.levels];
    const swap = dir === 'up' ? index - 1 : index + 1;
    if (swap < 0 || swap >= arr.length) return;
    [arr[index], arr[swap]] = [arr[swap], arr[index]];
    updateCriterion(critId, { levels: arr });
  };

  const exportJSON = () => JSON.stringify(rubric, null, 2);
  const importJSON = (text) => {
    try {
      const parsed = JSON.parse(text);
      setRubric(parsed);
      return true;
    } catch (e) {
      return false;
    }
  };

  const validate = () => {
    if (!rubric.name || rubric.name.trim() === "") return "Rubric must have a name";
    if (!rubric.observationId) return "Please link an indicator";
    if (!Array.isArray(rubric.criteria) || rubric.criteria.length === 0) return "Add at least one criterion";
    for (const c of rubric.criteria) {
      if (!c.name || c.name.trim() === "") return "Each criterion must have a name";
      if (!Array.isArray(c.levels) || c.levels.length === 0) return `Criterion "${c.name}" must have at least one level`;
      for (const l of c.levels) {
        if (!l.name || l.name.trim() === "") return "Each level must have a name";
      }
    }
    return null;
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold">Rubric Editor</h3>
          <p className="text-sm text-gray-600">Author rubrics at district level and link to indicators.</p>
        </div>

        <div className="text-right space-y-2">
          <div className="text-xs text-gray-500">Preview / Export</div>
          <div className="mt-2 flex space-x-2">
            <button type="button" onClick={() => navigator.clipboard?.writeText(exportJSON())} className="px-2 py-1 border rounded">Copy JSON</button>
            {onSave && <button type="button" onClick={() => onSave(rubric)} className="px-2 py-1 bg-green-600 text-white rounded">Save</button>}
          </div>
          
          {/* SOLO preset button */}
          <div className="mt-2">
            <button
              type="button"
              onClick={() => {
                setRubric({
                  ...rubric,
                  name: "SOLO Rubric",
                  description: "Structure of Observed Learning Outcomes",
                  criteria: [{
                    id: "crit_solo",
                    name: "SOLO Levels",
                    levels: [
                      { id: "lvl0", name: "Prestructural", descriptor: "Irrelevant or no response", score: 0 },
                      { id: "lvl1", name: "Unistructural", descriptor: "Mentions one relevant idea", score: 1 },
                      { id: "lvl2", name: "Multistructural", descriptor: "Lists several relevant ideas but not connected", score: 2 },
                      { id: "lvl3", name: "Relational", descriptor: "Integrates ideas into a logical explanation", score: 3 },
                      { id: "lvl4", name: "Extended Abstract", descriptor: "Generalizes principle beyond given case", score: 4 }
                    ]
                  }]
                });
              }}
              className="px-2 py-1 border rounded bg-purple-600 text-white"
            >
              Insert SOLO Levels
            </button>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block font-medium">Rubric name</label>
          <input value={rubric.name} onChange={(e) => updateField('name', e.target.value)} disabled={readOnly} className="border p-2 rounded w-full" />
        </div>

        <div>
          <label className="block font-medium">Linked Indicator</label>
          <select value={rubric.observationId} onChange={(e) => updateField('observationId', e.target.value)} disabled={readOnly} className="border p-2 rounded w-full">
            <option value="">-- select indicator --</option>
            {observations.map((o) => <option key={o.id} value={o.id}>{o.name || o.id}</option>)}
          </select>
        </div>

        <div className="col-span-2">
          <label className="block font-medium">Description</label>
          <textarea rows={2} value={rubric.description} onChange={(e) => updateField('description', e.target.value)} disabled={readOnly} className="border p-2 rounded w-full" />
        </div>
      </div>

      {/* Criteria + Levels */}
      <div>
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">Criteria</h4>
          {!readOnly && <button type="button" onClick={addCriterion} className="px-2 py-1 bg-blue-600 text-white rounded">+ Add Criterion</button>}
        </div>

        <div className="space-y-3 mt-2">
          {(rubric.criteria || []).map((c, ci) => (
            <div key={c.id} className="border rounded p-3 bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-1">
                  <input value={c.name} onChange={(e) => updateCriterion(c.id, { name: e.target.value })} disabled={readOnly} className="font-medium w-full border-b pb-1" />
                  <input value={c.description || ''} onChange={(e) => updateCriterion(c.id, { description: e.target.value })} disabled={readOnly} placeholder="(optional) short note" className="w-full text-sm text-gray-600" />
                </div>

                <div className="ml-3 flex flex-col items-end space-y-1">
                  <div className="flex space-x-1">
                    <button type="button" onClick={() => moveCriterion(ci, 'up')} title="Move up" className="px-2 py-0.5 border rounded">↑</button>
                    <button type="button" onClick={() => moveCriterion(ci, 'down')} title="Move down" className="px-2 py-0.5 border rounded">↓</button>
                    {!readOnly && <button type="button" onClick={() => removeCriterion(c.id)} className="px-2 py-0.5 border rounded text-red-600">Delete</button>}
                  </div>
                  <div className="text-xs text-gray-500">Levels: {(c.levels || []).length}</div>
                </div>
              </div>

              {/* Levels table */}
              <div className="mt-3">
                <div className="grid grid-cols-12 gap-2 text-xs font-semibold border-b pb-1 mb-2">
                  <div className="col-span-3">Level name</div>
                  <div className="col-span-7">Descriptor</div>
                  <div className="col-span-2">Score</div>
                </div>

                {(c.levels || []).map((l, li) => (
                  <div key={l.id} className="grid grid-cols-12 gap-2 items-start mb-2">
                    <div className="col-span-3">
                      <input value={l.name} onChange={(e) => updateLevel(c.id, l.id, { name: e.target.value })} disabled={readOnly} className="border p-1 rounded w-full text-sm" />
                    </div>

                    <div className="col-span-7">
                      <input value={l.descriptor} onChange={(e) => updateLevel(c.id, l.id, { descriptor: e.target.value })} disabled={readOnly} className="border p-1 rounded w-full text-sm" />
                    </div>

                    <div className="col-span-2 flex items-center space-x-1">
                      <input type="number" value={l.score} onChange={(e) => updateLevel(c.id, l.id, { score: Number(e.target.value) })} disabled={readOnly} className="border p-1 rounded w-20 text-sm" />
                      <div className="flex flex-col">
                        <button type="button" onClick={() => moveLevel(c.id, li, 'up')} className="px-2 py-0.5 border rounded">↑</button>
                        <button type="button" onClick={() => moveLevel(c.id, li, 'down')} className="px-2 py-0.5 border rounded">↓</button>
                      </div>
                      {!readOnly && <button type="button" onClick={() => removeLevel(c.id, l.id)} className="px-2 py-0.5 border rounded text-red-600">✕</button>}
                    </div>
                  </div>
                ))}

                {!readOnly && (
                  <div className="mt-2">
                    <button type="button" onClick={() => addLevel(c.id)} className="px-2 py-1 border rounded">+ Add level</button>
                  </div>
                )}

              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preview & JSON */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="font-semibold">Preview</h4>
          <div className="mt-2 border rounded p-3 bg-white">
            <div className="text-sm font-medium">{rubric.name}</div>
            <div className="text-xs text-gray-500">Linked indicator: {observations.find(o => o.id === rubric.observationId)?.name || rubric.observationId}</div>
            <div className="mt-2 space-y-2">
              {rubric.criteria.map((c) => (
                <div key={c.id} className="p-2 border rounded">
                  <div className="font-semibold text-sm">{c.name}</div>
                  <div className="text-xs text-gray-600 mb-1">{c.description}</div>
                  <ol className="list-decimal ml-5 text-sm">
                    {c.levels.map((l) => (
                      <li key={l.id} className="mb-1">
                        <div className="flex justify-between">
                          <div>
                            <div className="font-medium">{l.name}</div>
                            <div className="text-xs text-gray-600">{l.descriptor}</div>
                          </div>
                          <div className="text-sm text-gray-700">Score: {l.score}</div>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div>
          <h4 className="font-semibold">JSON (advanced)</h4>
          <textarea rows={20} value={exportJSON()} onChange={(e) => {/* read-only display only */}} className="w-full border p-2 rounded font-mono text-xs bg-gray-100" readOnly />
          {!readOnly && (
            <div className="mt-2 flex space-x-2">
              <button type="button" onClick={() => {
                const txt = prompt('Paste JSON to import (replace rubric)');
                if (!txt) return;
                const ok = importJSON(txt);
                if (!ok) alert('Invalid JSON');
              }} className="px-2 py-1 border rounded">Import JSON</button>

              <button type="button" onClick={() => {
                const err = validate();
                if (err) { alert(err); return; }
                if (onSave) onSave(rubric);
                else alert('Rubric validated. No save handler provided.');
              }} className="px-2 py-1 bg-indigo-600 text-white rounded">Validate & Save</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
