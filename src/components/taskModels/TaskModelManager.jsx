// src/components/taskModels/TaskModelManager.jsx
import React, { useState, useEffect } from "react";
import Card from "../ui/Card";
import Modal from "../ui/Modal";
import TaskModelForm from "./TaskModelForm";
import TaskModelList from "./TaskModelList";
import TaskModelDetails from "./TaskModelDetails";

export default function TaskModelManager({ notify, refresh }) {
  const [taskModels, setTaskModels] = useState([]);
  const [modal, setModal] = useState({ open: false, id: null });
  const [detailsModel, setDetailsModel] = useState(null);

  // Load task models
  useEffect(() => {
    fetch("/api/taskModels")
      .then((r) => r.json())
      .then((data) => setTaskModels(data || []));
  }, [refresh]);

  // Add new task model
  const saveTaskModel = async (model) => {
    const res = await fetch("/api/taskModels", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(model),
    });

    if (res.ok) {
      const newModel = await res.json();
      setTaskModels((prev) => [...prev, newModel]);
      notify("Task model added.");
    } else {
      const err = await res.json();
      notify("❌ Failed to add task model: " + err.error);
    }
  };

  // Remove task model (with cascade delete of tasks)
  const removeTaskModel = async (id) => {
    const res = await fetch(`/api/taskModels/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTaskModels((prev) => prev.filter((tm) => tm.id !== id));
      notify("Task model removed.");
    } else {
      notify("❌ Failed to remove task model");
    }
  };

  return (
    <Card title="Task Models (Blueprints)">
      {/* Add Form */}
      <TaskModelForm onSave={saveTaskModel} notify={notify} />

      {/* List of Task Models */}
      <TaskModelList
        taskModels={taskModels}
        onSelect={(tm) => setDetailsModel(tm)}
        onRemove={(id) => setModal({ open: true, id })}
      />

      {/* Confirm Delete */}
      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, id: null })}
        onConfirm={() => {
          const idToRemove = modal.id;
          setModal({ open: false, id: null });
          removeTaskModel(idToRemove);
        }}
        title="Confirm Delete"
        message="Remove this task model? This will also remove linked tasks."
      />

      {/* Details Modal */}
      {detailsModel && (
        <TaskModelDetails
          taskModel={detailsModel}
          onClose={() => setDetailsModel(null)}
        />
      )}
    </Card>
  );
}
