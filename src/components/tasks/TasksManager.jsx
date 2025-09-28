import React, { useEffect, useState } from "react";

// TasksManager.jsx
// Minimal UI for managing tasks (create instances of task models with optional linked questions)

export default function TasksManager({ notify }) {
  const [tasks, setTasks] = useState([]);
  const [taskModels, setTaskModels] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedModelId, setSelectedModelId] = useState("");
  const [selectedQuestionId, setSelectedQuestionId] = useState("");

  // Load tasks, taskModels, questions
  useEffect(() => {
    Promise.all([
      fetch("/api/tasks").then((r) => r.json()),
      fetch("/api/taskModels").then((r) => r.json()),
      fetch("/api/questions").then((r) => r.json()),
    ])
      .then(([t, tm, qs]) => {
        setTasks(t || []);
        setTaskModels(tm || []);
        setQuestions(qs || []);
      })
      .catch(() => notify?.("❌ Failed to load tasks/task models/questions"))
      .finally(() => setLoading(false));
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!selectedModelId) return notify?.("Select a task model");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskModelId: selectedModelId,
          questionId: selectedQuestionId || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create task");
      const created = await res.json();
      setTasks([...tasks, created]);
      setSelectedModelId("");
      setSelectedQuestionId("");
      notify?.("Task created");
    } catch (err) {
      console.error(err);
      notify?.("❌ Failed to create task");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this task?")) return;
    try {
      const res = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      setTasks(tasks.filter((t) => t.id !== id));
      notify?.("Task deleted");
    } catch (err) {
      console.error(err);
      notify?.("❌ Failed to delete task");
    }
  };

  const getModelName = (id) => taskModels.find((m) => m.id === id)?.name || id;
  const getQuestionStem = (id) => questions.find((q) => q.id === id)?.stem || id;

  if (loading) return <div className="p-4">Loading tasks...</div>;

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">Tasks</h2>

      {/* Add new task */}
      <form onSubmit={handleAdd} className="space-y-2 p-3 border rounded bg-gray-50">
        <div>
          <label className="block text-sm font-medium">Task Model</label>
          <select
            className="border p-2 rounded w-full"
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
          >
            <option value="">-- choose model --</option>
            {taskModels.map((tm) => (
              <option key={tm.id} value={tm.id}>{tm.name || tm.id}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Question (optional)</label>
          <select
            className="border p-2 rounded w-full"
            value={selectedQuestionId}
            onChange={(e) => setSelectedQuestionId(e.target.value)}
          >
            <option value="">-- none --</option>
            {questions.map((q) => (
              <option key={q.id} value={q.id}>{q.stem ? q.stem.slice(0, 40) : q.id}</option>
            ))}
          </select>
        </div>

        <button type="submit" className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700">
          Create Task
        </button>
      </form>

      {/* List tasks */}
      {tasks.length > 0 ? (
        <ul className="divide-y border rounded">
          {tasks.map((t) => (
            <li key={t.id} className="flex justify-between items-center p-2">
              <div>
                <div className="font-medium">{getModelName(t.taskModelId)}</div>
                {t.questionId && (
                  <div className="text-sm text-gray-600">Q: {getQuestionStem(t.questionId)}</div>
                )}
                <div className="text-xs text-gray-400">{t.id}</div>
              </div>
              <button
                onClick={() => handleDelete(t.id)}
                className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">No tasks defined yet</p>
      )}
    </div>
  );
}
