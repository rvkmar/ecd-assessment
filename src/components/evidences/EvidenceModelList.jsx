import React from "react";

export default function EvidenceModelList({ models, setEditingModel, setModels, notify }) {
  return (
    <div>
      <h3>Evidence Models</h3>
      <ul>
        {models.map((m) => (
          <li key={m.id} className="flex justify-between">
            <span>{m.name}</span>
            <div>
              <button onClick={() => setEditingModel(m)}>Edit</button>
              <button onClick={() => notify("TODO: remove model")}>Remove</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
