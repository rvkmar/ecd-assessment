import express from "express";
import { loadDB, saveDB } from "../../src/utils/db-server.js";

const router = express.Router();

// ------------------------------
// GET /api/tasks
// ------------------------------
router.get("/", (req, res) => {
  const db = loadDB();
  res.json(db.tasks || []);
});

// ------------------------------
// GET /api/tasks/:id
// ------------------------------
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const task = db.tasks.find((t) => t.id === id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

// ------------------------------
// POST /api/tasks
// ------------------------------
// body: { title, itemIds, evidenceModelId, type, taskModel, actionModel }
router.post("/", (req, res) => {
  const { title, itemIds, evidenceModelId, type, taskModel, actionModel } = req.body;
  const db = loadDB();

  if (!title || !itemIds || !evidenceModelId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  const newTask = {
    id: `t${Date.now()}`,
    title,
    itemIds,
    evidenceModelId,
    modelLabel: `tm${(db.tasks || []).length + 1}`,
    type: type || "TaskModel",
    taskModel: type === "TaskModel" ? taskModel || {} : null,
    actionModel: type === "ActionModel" ? actionModel || {} : null,
  };

  db.tasks.push(newTask);
  saveDB(db);
  res.status(201).json(newTask);
});

// ------------------------------
// PUT /api/tasks/:id (update task)
// ------------------------------
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = loadDB();
  const idx = db.tasks.findIndex((t) => t.id === id);
  if (idx === -1) return res.status(404).json({ error: "Task not found" });

  db.tasks[idx] = { ...db.tasks[idx], ...updates };
  saveDB(db);
  res.json(db.tasks[idx]);
});

// ------------------------------
// DELETE /api/tasks/:id
// ------------------------------
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const before = db.tasks.length;
  db.tasks = db.tasks.filter((t) => t.id !== id);
  if (db.tasks.length === before) {
    return res.status(404).json({ error: "Task not found" });
  }

  // Also remove linked sessions
  db.sessions = db.sessions.filter((s) => s.taskId !== id);

  saveDB(db);
  res.json({ success: true });
});

export default router;