import React, { useState, useEffect } from "react";
// import { loadDB, saveDB } from "../api/mockApi";
import { loadDB, saveDB, exportDB, importDB, clearDB } from "../utils/db";

import Card from "./Card";
import Modal from "./Modal";

export default function TasksManager({ notify, refresh }) {
  const [tasks, setTasks] = useState(loadDB().tasks);
  const [title, setTitle] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [modelId, setModelId] = useState("");
  const [modal, setModal] = useState({ open: false, id: null });

  const items = loadDB().items;
  const models = loadDB().evidenceModels;

  useEffect(() => {
    setTasks(loadDB().tasks);
  }, [refresh]);

  const toggleItemSelection = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addTask = () => {
    if (!title.trim() || !selectedItems.length || !modelId)
      return notify("Fill all fields");
    const db = loadDB();
    db.tasks.push({
      id: `t${Date.now()}`,
      title,
      itemIds: selectedItems,
      evidenceModelId: modelId,
    });
    saveDB(db);
    setTasks(db.tasks);
    setTitle("");
    setSelectedItems([]);
    setModelId("");
    notify("Task added.");
    refresh();
  };

  const removeTask = (id) => {
    const db = loadDB();
    db.tasks = db.tasks.filter((t) => t.id !== id);
    db.sessions = db.sessions.filter((s) => s.taskId !== id);
    saveDB(db);
    setTasks(db.tasks);
    notify("Task removed.");
    refresh();
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
            />{" "}
            {it.text}
          </label>
        ))}
      </div>
      <select
        className="border p-2 w-full mb-2"
        value={modelId}
        onChange={(e) => setModelId(e.target.value)}
      >
        <option value="">Select model</option>
        {models.map((m) => (
          <option key={m.id} value={m.id}>
            {m.name}
          </option>
        ))}
      </select>
      <button
        onClick={addTask}
        className="px-3 py-1 bg-blue-500 text-white rounded"
      >
        Add Task
      </button>
      <ul className="mt-2 text-sm space-y-1">
        {tasks.map((t) => (
          <li key={t.id} className="flex justify-between items-center">
            <span>{t.title}</span>
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
          removeTask(modal.id);
          setModal({ open: false, id: null });
        }}
        title="Confirm Delete"
        message="Remove this task? This will also remove linked sessions."
      />
    </Card>
  );
}
