import React from "react";


export default function TableView({ competencies, models, onEdit }) {
return (
<div className="overflow-auto">
<table className="w-full text-sm border-collapse">
<thead>
<tr className="text-left border-b">
<th className="p-2">ID</th>
<th>Name</th>
<th>Parent</th>
<th>Model</th>
<th>Links</th>
<th>Actions</th>
</tr>
</thead>
<tbody>
{competencies.map((c) => (
<tr key={c.id} className="border-b">
<td className="p-2 font-mono text-xs">{c.id}</td>
<td className="p-2">{c.name}<div className="text-xs text-gray-500">{c.description}</div></td>
<td className="p-2">{competencies.find((p) => p.id === c.parentId)?.name || "—"}</td>
<td className="p-2">{models.find((m) => m.id === c.modelId)?.name || "—"}</td>
<td className="p-2 text-xs">{(c.crossLinkedCompetencyIds || []).length}</td>
<td className="p-2">
<button onClick={() => onEdit(c)} className="px-2 py-0.5 bg-yellow-500 text-white rounded text-xs">Edit</button>
</td>
</tr>
))}
</tbody>
</table>
</div>
);
}