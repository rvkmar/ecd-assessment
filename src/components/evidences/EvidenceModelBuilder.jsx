import React, { useState, useEffect } from "react";
import EvidenceModelList from "./EvidenceModelList";
import EvidenceModelForm from "./EvidenceModelForm";

export default function EvidenceModelBuilder() {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);

  // Load evidence models from backend
  useEffect(() => {
    fetch("/api/evidenceModels")
      .then((res) => res.json())
      .then((data) => setModels(data || []))
      .catch(() => setModels([]));
  }, []);

  const handleSave = async (model) => {
    try {
      if (model.id) {
        // Update existing model
        const res = await fetch(`/api/evidenceModels/${model.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(model),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`Failed to update: ${err.error || res.statusText}`);
          return;
        }
        const updated = await res.json();
        setModels(models.map((m) => (m.id === updated.id ? updated : m)));
        setSelectedModel(null);
      } else {
        // Create new model
        const res = await fetch("/api/evidenceModels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(model),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          alert(`Failed to create: ${err.error || res.statusText}`);
          return;
        }
        const created = await res.json();
        setModels([...models, created]);
        setSelectedModel(null);
      }
    } catch (err) {
      console.error("Error saving evidence model", err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/evidenceModels/${id}`, { method: "DELETE" });
      setModels(models.filter((m) => m.id !== id));
      if (selectedModel?.id === id) {
        setSelectedModel(null);
      }
    } catch (err) {
      console.error("Error deleting evidence model", err);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Evidence Models</h2>

      {/* List of models */}
      <EvidenceModelList
        models={models}
        onEdit={(m) => setSelectedModel(m)}
        onDelete={handleDelete}
      />

      {/* Form for creating/editing */}
      {selectedModel && (
        <div className="p-4 border rounded-md bg-gray-50">
          <EvidenceModelForm model={selectedModel} onSave={handleSave} />
        </div>
      )}

      {!selectedModel && (
        <button
          onClick={() =>
            setSelectedModel({
              name: "",
              description: "",
              evidences: [],
              constructs: [],
              observations: [],
              rubrics: [],
              measurementModel: { type: "sum", weights: {} },
            })
          }
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Evidence Model
        </button>
      )}
    </div>
  );
}
