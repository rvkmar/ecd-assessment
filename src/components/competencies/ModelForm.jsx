import React from "react";

export default function ModelForm({ form, setForm, onSave }) {
  return (
    <div>
      <input className="border p-2 w-full mb-2"
        placeholder="Competency Framework Name"
        value={form.name}
        onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
      <textarea className="border p-2 w-full mb-2"
        placeholder="Competency Framework description"
        value={form.description}
        onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
      <div className="flex gap-2">
        <button onClick={onSave} className="px-3 py-1 bg-blue-500 text-white rounded">
          {form.id ? "Update Competency Framework" : "Add Competency Framework"}
        </button>
        {form.id && (
          <button onClick={() => setForm({ id: null, name: "", description: "" })}
            className="px-3 py-1 bg-gray-300 rounded">Cancel</button>
        )}
      </div>
    </div>
  );
}
