import React from "react";

export default function Spinner() {
  return (
    <div className="flex items-center justify-center py-6">
      <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-blue-600"></div>
    </div>
  );
}
