import React from "react";


export default function ListView({ competencies, onEdit }) {
return (
<ul className="space-y-2">
{competencies.map((c) => (
<li key={c.id} className="flex items-center gap-2 border-b py-2">
<div>
<div className="font-medium">{c.name}</div>
<div className="text-xs text-gray-500">{c.description}</div>
</div>
<div className="ml-auto flex gap-2">
<button onClick={() => onEdit(c)} className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded">Edit</button>
</div>
</li>
))}
</ul>
);
}