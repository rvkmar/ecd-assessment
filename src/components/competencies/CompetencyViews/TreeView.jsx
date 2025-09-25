import React, { useState } from "react";

// Tailwind-styled collapsible TreeView inspired by Microsoft 'simple' tree example
export default function TreeView({ competencies, activeModelId, onEdit }) {
  const [expanded, setExpanded] = useState(new Set());
  const [selected, setSelected] = useState(null);

  const toggleExpand = (id) => {
    const next = new Set(expanded);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  // Safe recursion with cycle detection. parentId === null treats roots.
  const buildTree = (parentId = null, level = 0, visited = new Set()) => {
    return competencies
      .filter((c) => {
        const matchParent = parentId === null ? (c.parentId === null || c.parentId === undefined || c.parentId === "") : c.parentId === parentId;
        const matchModel = !activeModelId || c.modelId === activeModelId;
        return matchParent && matchModel;
      })
      .map((c) => {
        if (visited.has(c.id)) {
          // cycle detected — skip to avoid infinite recursion
          return null;
        }
        const newVisited = new Set(visited);
        newVisited.add(c.id);
        const children = buildTree(c.id, level + 1, newVisited);
        const hasChildren = children.filter(Boolean).length > 0;
        const isExpanded = expanded.has(c.id);
        const isSelected = selected === c.id;

        return (
          <li key={c.id} className="py-1">
            <div
              role="treeitem"
              aria-expanded={hasChildren ? isExpanded : undefined}
              onClick={() => {
                setSelected(c.id);
              }}
              className={`flex items-center gap-2 cursor-pointer select-none rounded px-2 py-1 ${isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-gray-50'}`}
            >
              {/* caret */}
              {hasChildren ? (
                <button
                  aria-label={isExpanded ? 'Collapse' : 'Expand'}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleExpand(c.id);
                  }}
                  className="w-4 h-4 flex items-center justify-center focus:outline-none"
                >
                  {isExpanded ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  )}
                </button>
              ) : (
                <span className="w-4 h-4" />
              )}

              {/* label and meta */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-gray-900">{c.name}</span>
                  {c.description && <span className="text-xs text-gray-400 truncate">{c.description}</span>}
                </div>
              </div>

              <div className="flex-shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit && onEdit(c);
                  }}
                  className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded"
                >
                  Edit
                </button>
              </div>
            </div>

            {/* children — styled with a subtle vertical connector line */}
            {hasChildren && isExpanded && (
              <ul className="ml-4 mt-1 pl-3 border-l border-gray-200">{children}</ul>
            )}
          </li>
        );
      })
      .filter(Boolean);
  };

  return (
    <div role="tree" aria-label="Competency tree" className="text-sm">
      <ul className="space-y-0">{buildTree(null)}</ul>
    </div>
  );
}
