import React from "react";
import Card from "./Card";
import { loadDB } from "../utils/db";

export default function TaskDetails({ task, onClose }) {
  if (!task) return null;

  const models = loadDB().evidenceModels;
  const model = models.find((m) => m.id === task.evidenceModelId);
  const modelName = model ? model.name : task.modelLabel || task.evidenceModelId;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg w-2/3 max-h-[90vh] overflow-y-auto p-4">
        <h2 className="text-xl font-bold mb-2">Task Details</h2>
        <p className="mb-2"><strong>Title:</strong> {task.title}</p>
        <p className="mb-2"><strong>Type:</strong> {task.type}</p>
        <p className="mb-2"><strong>Evidence Model:</strong> {modelName}</p>

        {task.type === "TaskModel" && task.taskModel && (
          <Card title="Task Model">
            <p><strong>Presentation Format:</strong> {task.taskModel.presentationFormat || "-"}</p>
            <p><strong>Work Product:</strong> {task.taskModel.workProduct || "-"}</p>
            <p><strong>Difficulty:</strong> {task.taskModel.difficulty || "-"}</p>
          </Card>
        )}

        {task.type === "ActionModel" && task.actionModel && (
          <Card title="Action Model">
            <p><strong>Interactions:</strong> {task.actionModel.interactions || "-"}</p>
            <p><strong>Rules:</strong> {task.actionModel.rules || "-"}</p>
            <p><strong>Outcomes:</strong> {task.actionModel.outcomes || "-"}</p>
          </Card>
        )}

        <div className="mt-4 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
