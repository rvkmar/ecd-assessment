import React from "react";

export default function Modal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmClass = "bg-blue-500 hover:bg-blue-600 text-white", // ✅ default
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();   // run caller’s confirm action
    if (onClose) onClose();       // always close modal afterwards
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white p-6 rounded-xl shadow-lg max-w-sm w-full">
        <h3 className="font-bold text-lg mb-2">{title}</h3>
        <p className="mb-4">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1 bg-gray-300 hover:bg-gray-400 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`px-3 py-1 rounded ${confirmClass}`}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
