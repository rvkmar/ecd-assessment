import React, { useState, useEffect } from "react";
import Card from "./Card";
import Modal from "./Modal";

export default function TaskDetails({ task, onClose }) {
  const [model, setModel] = useState(null);
  const [items, setItems] = useState([]);

  // Fetch evidence model + items via API
  useEffect(() => {
    if (task?.evidenceModelId) {
      fetch(`/api/evidenceModels`)
        .then((r) => r.json())
        .then((models) => {
          const found = models.find((m) => m.id === task.evidenceModelId);
          setModel(found || null);
        });
    }
    if (task?.itemIds?.length) {
      fetch(`/api/items`)
        .then((r) => r.json())
        .then((allItems) =>
          setItems(allItems.filter((i) => task.itemIds.includes(i.id)))
        );
    }
  }, [task]);

  if (!task) return null;

  return (
    <Modal
      isOpen={!!task}
      onClose={onClose}
      title={`Task Details: ${task.title}`}
      message=""
    >
      <Card>
        <p>
          <strong>Model Label:</strong> {task.modelLabel || "-"}
        </p>
        <p>
          <strong>Evidence Model:</strong> {model ? model.name : "Not found"}
        </p>
        <p>
          <strong>Type:</strong> {task.type}
        </p>

        {task.taskModel && (
          <>
            <p>
              <strong>Presentation:</strong>{" "}
              {task.taskModel.presentationFormat || "-"}
            </p>
            <p>
              <strong>Work Product:</strong> {task.taskModel.workProduct || "-"}
            </p>
            <p>
              <strong>Difficulty:</strong> {task.taskModel.difficulty || "-"}
            </p>
          </>
        )}

        {task.actionModel && (
          <>
            <p>
              <strong>Interactions:</strong> {task.actionModel.interactions}
            </p>
            <p>
              <strong>Rules:</strong> {task.actionModel.rules}
            </p>
            <p>
              <strong>Outcomes:</strong> {task.actionModel.outcomes}
            </p>
          </>
        )}

        <h4 className="mt-3 font-semibold">Items</h4>
        <ul className="list-disc ml-5">
          {items.map((it) => (
            <li key={it.id}>
              {it.type.toUpperCase()}: {it.text}
            </li>
          ))}
        </ul>
      </Card>
    </Modal>
  );
}
