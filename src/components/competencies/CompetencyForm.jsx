import React from "react";


export default function CompetencyForm({ form, setForm, models, competencies, activeModelId, onSave }) {
return (
<div>
<input className="border p-2 w-full mb-2" placeholder="Competency name"
value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
<textarea className="border p-2 w-full mb-2" placeholder="Description"
value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />


<select className="border p-2 w-full mb-2" value={form.parentId || ""}
onChange={(e) => setForm((s) => ({ ...s, parentId: e.target.value || null }))}>
<option value="">No parent (root competency)</option>
{competencies.filter((c) => c.modelId === (activeModelId || null)).map((c) => (
<option key={c.id} value={c.id}>{c.name}</option>
))}
</select>


<select className="border p-2 w-full mb-2" value={form.modelId || activeModelId || ""}
onChange={(e) => setForm((s) => ({ ...s, modelId: e.target.value }))}>
<option value="">Select model</option>
{models.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
</select>


<div className="flex gap-2">
<button onClick={onSave} className="px-3 py-1 bg-blue-500 text-white rounded">
{form.id ? "Update" : "Add"}
</button>
{form.id && <button onClick={() => setForm({ id: null, name: "", description: "", parentId: "", modelId: "" })} className="px-3 py-1 bg-gray-300 rounded">Cancel</button>}
</div>
</div>
);
}