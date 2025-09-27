// src/components/taskModels/TaskModelList.jsx
import React from "react";

export default function TaskModelList({ taskModels, onSelect, onRemove }) {
  if (!taskModels.length) {
    return <p className="text-sm text-gray-500">No task models defined yet.</p>;
  }

  return (
    <ul className="mt-3 text-sm space-y-2">
      {taskModels.map((tm) => (
        <li
          key={tm.id}
          className="flex justify-between items-center border-b pb-1"
        >
          <span
            onClick={() => onSelect(tm)}
            className="cursor-pointer hover:underline"
          >
            <strong>{tm.name}</strong> – {tm.description}
          </span>
          <button
            onClick={() => onRemove(tm.id)}
            className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
          >
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}
