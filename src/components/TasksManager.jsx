import React, { useState, useEffect } from "react";
import Card from "./Card";
import Modal from "./Modal";
import TaskDetails from "./TaskDetails";

export default function TasksManager({ notify, refresh }) {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [modelId, setModelId] = useState("");
  const [modal, setModal] = useState({ open: false, id: null });
  const [detailsTask, setDetailsTask] = useState(null);

  // Task Model fields
  const [presentationFormat, setPresentationFormat] = useState("");
  const [workProduct, setWorkProduct] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");

  // Action Model fields
  const [interactions, setInteractions] = useState("");
  const [rules, setRules] = useState("");
  const [outcomes, setOutcomes] = useState("");

  // Toggle type
  const [taskType, setTaskType] = useState("TaskModel");

  const [items, setItems] = useState([]);
  const [models, setModels] = useState([]);

  // Load tasks/items/models from API
  useEffect(() => {
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => setTasks(data || []));

    fetch("/api/items")
      .then((r) => r.json())
      .then((data) => setItems(data || []));

    fetch("/api/evidenceModels")
      .then((r) => r.json())
      .then((data) => setModels(data || []));
  }, [refresh]);

  // 🆕 Load single task from API when user clicks it
  const openTaskDetails = async (taskId) => {
    const res = await fetch(`/api/tasks/${taskId}`);
    if (res.ok) {
      const task = await res.json();
      setDetailsTask(task);
    } else {
      notify("❌ Failed to load task details");
    }
  };

  const toggleItemSelection = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addTask = async () => {
    if (!title.trim()) return notify("Enter a task title");
    if (!selectedItems.length) return notify("Add question items");
    if (!modelId) return notify("Select an evidence model");

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        itemIds: selectedItems,
        evidenceModelId: modelId,
        type: taskType,
        taskModel:
          taskType === "TaskModel"
            ? { presentationFormat, workProduct, difficulty }
            : null,
        actionModel:
          taskType === "ActionModel"
            ? { interactions, rules, outcomes }
            : null,
      }),
    });

    if (res.ok) {
      const newTask = await res.json();
      setTasks((prev) => [...prev, newTask]);
      setTitle("");
      setSelectedItems([]);
      setModelId("");
      setPresentationFormat("");
      setWorkProduct("");
      setDifficulty("Medium");
      setInteractions("");
      setRules("");
      setOutcomes("");
      setTaskType("TaskModel");
      notify("Task added.");
      refresh();
    } else {
      notify("❌ Failed to add task");
    }
  };

  const removeTask = async (id) => {
    const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    if (res.ok) {
      setTasks((prev) => prev.filter((t) => t.id !== id));
      notify("Task removed.");
      refresh();
    } else {
      notify("❌ Failed to remove task");
    }
  };

  return (
    <Card title="Tasks">
      <input
        className="border p-2 w-full mb-2"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Task title"
      />
      <div className="mb-2">
        <p className="text-sm mb-1">Select Items:</p>
        {items.map((it) => (
          <label key={it.id} className="block text-sm">
            <input
              type="checkbox"
              checked={selectedItems.includes(it.id)}
              onChange={() => toggleItemSelection(it.id)}
            /> {it.text}
          </label>
        ))}
      </div>

      {/* Evidence Model Selection */}
      <select
        className="border p-2 w-full mb-2"
        value={modelId}
        onChange={(e) => setModelId(e.target.value)}
      >
        <option value="">Select Evidence Model</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      {/* Toggle Task or Action Model */}
      <select
        className="border p-2 w-full mb-2"
        value={taskType}
        onChange={(e) => setTaskType(e.target.value)}
      >
        <option value="TaskModel">Task Model</option>
        <option value="ActionModel">Action Model</option>
      </select>

      {taskType === "TaskModel" && (
        <>
          <input
            className="border p-2 w-full mb-2"
            value={presentationFormat}
            onChange={(e) => setPresentationFormat(e.target.value)}
            placeholder="Presentation format"
          />

          <input
            className="border p-2 w-full mb-2"
            value={workProduct}
            onChange={(e) => setWorkProduct(e.target.value)}
            placeholder="Work product"
          />

          <select
            className="border p-2 w-full mb-2"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
          >
            <option value="Easy">Easy</option>
            <option value="Medium">Medium</option>
            <option value="Hard">Hard</option>
          </select>
        </>
      )}

      {taskType === "ActionModel" && (
        <>
          <textarea
            className="border p-2 w-full mb-2"
            value={interactions}
            onChange={(e) => setInteractions(e.target.value)}
            placeholder="Interactions"
          />

          <textarea
            className="border p-2 w-full mb-2"
            value={rules}
            onChange={(e) => setRules(e.target.value)}
            placeholder="Rules"
          />

          <textarea
            className="border p-2 w-full mb-2"
            value={outcomes}
            onChange={(e) => setOutcomes(e.target.value)}
            placeholder="Outcomes"
          />
        </>
      )}

      <button
        onClick={addTask}
        className="px-3 py-1 bg-blue-500 text-white rounded"
      >
        Add Task
      </button>

      <ul className="mt-2 text-sm space-y-1">
        {tasks.map((t) => (
          <li key={t.id} className="flex justify-between items-center">
            <span
              onClick={() => openTaskDetails(t.id)}
              className="cursor-pointer hover:underline"
            >
              {t.modelLabel ? `${t.modelLabel}: ` : ""}{t.title}
            </span>
            <button
              onClick={() => setModal({ open: true, id: t.id })}
              className="px-2 py-0.5 bg-red-500 text-white rounded text-xs"
            >
              Remove
            </button>
          </li>
        ))}
      </ul>

      <Modal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, id: null })}
        onConfirm={() => {
          const idToRemove = modal.id;
          setModal({ open: false, id: null });
          removeTask(idToRemove);
        }}
        title="Confirm Delete"
        message="Remove this task? This will also remove linked sessions."
      />

      {detailsTask && (
        <TaskDetails
          task={detailsTask}
          onClose={() => setDetailsTask(null)}
        />
      )}
    </Card>
  );
}