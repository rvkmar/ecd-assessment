// src/components/taskModels/TaskModelBuilder.jsx
import React, { useState, useEffect } from "react";
import TaskModelList from "./TaskModelList";
import TaskModelForm from "./TaskModelForm";

export default function TaskModelBuilder({ notify }) {
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState(null);

  // Load task models from backend
  useEffect(() => {
    fetch("/api/taskModels")
      .then((res) => res.json())
      .then((data) => setModels(data || []))
      .catch(() => setModels([]));
  }, []);

  const handleSave = async (model) => {
    try {
      if (model.id) {
        // Update existing model
        const res = await fetch(`/api/taskModels/${model.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(model),
        });
        const updated = await res.json();
        setModels(models.map((m) => (m.id === updated.id ? updated : m)));
        setSelectedModel(null);
        notify?.("Activity template updated.");
      } else {
        // Create new model
        const res = await fetch("/api/taskModels", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(model),
        });
        const created = await res.json();
        setModels([...models, created]);
        setSelectedModel(null);
        notify?.("Activity template created.");
      }
    } catch (err) {
      console.error("Error saving activity template", err);
      notify?.("❌ Failed to save activity template");
    }
  };

  const handleDelete = async (id) => {
    try {
      await fetch(`/api/taskModels/${id}`, { method: "DELETE" });
      setModels(models.filter((m) => m.id !== id));
      if (selectedModel?.id === id) {
        setSelectedModel(null);
      }
      notify?.("Activity template deleted.");
    } catch (err) {
      console.error("Error deleting activity template", err);
      notify?.("❌ Failed to delete activity template");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Activity Template</h2>

      {/* List of models */}
      <TaskModelList
        models={models}
        onEdit={(m) => setSelectedModel(m)}
        onDelete={handleDelete}
      />

      {/* Form for creating/editing */}
      {selectedModel && (
        <div className="p-4 border rounded-md bg-gray-50">
          <TaskModelForm model={selectedModel} onSave={handleSave} notify={notify} />
        </div>
      )}

      {!selectedModel && (
        <button
          onClick={() =>
            setSelectedModel({
              name: "",
              description: "",
              actions: [],
              difficulty: "medium",
              evidenceModelIds: [],
              expectedObservations: [],
              itemMappings: [],
            })
          }
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          + New Activity Template
        </button>
      )}
    </div>
  );
}
