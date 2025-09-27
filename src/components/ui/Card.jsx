import React from "react";

export default function Card({ title, children, actions }) {
  return (
    <div className="bg-white rounded-2xl shadow p-4">
      <div className="flex justify-between items-center mb-2">
        {title && <h3 className="font-semibold">{title}</h3>}
        {actions}
      </div>
      {children}
    </div>
  );
}
