import React from "react";

// NavBar.jsx
// Reusable navigation bar component for dashboards (District, Teacher)
// Props:
// - tabs: [{ id, label }]
// - active: current tab id
// - onSelect(id): callback when tab selected
// - color: tailwind color prefix (e.g., "blue", "green")

export default function NavBar({ tabs = [], active, onSelect, color = "blue" }) {
  return (
    <nav className="mb-4 space-x-2">
      {tabs.map((t) => (
        <button
          key={t.id}
          onClick={() => onSelect(t.id)}
          className={`px-3 py-1 rounded ${
            active === t.id
              ? `bg-${color}-600 text-white`
              : "bg-gray-200 hover:bg-gray-300"
          }`}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
}
