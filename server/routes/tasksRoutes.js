import express from "express";
import { loadDB, saveDB } from "../../src/utils/db-server.js";
import { validateEntity } from "../../src/utils/schema.js";

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
  const db = loadDB();
  const task = db.tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  res.json(task);
});

// ------------------------------
// POST /api/tasks
// ------------------------------
// body: { taskModelId, questionId?, generatedEvidenceIds?, generatedObservationIds? }
router.post("/", (req, res) => {
  const db = loadDB();
  const { taskModelId, questionId, generatedEvidenceIds, generatedObservationIds } = req.body;

  if (!taskModelId) {
    return res.status(400).json({ error: "taskModelId is required" });
  }

  // ensure taskModel exists
  if (!db.taskModels.find(tm => tm.id === taskModelId)) {
    return res.status(400).json({ error: `Invalid taskModelId: ${taskModelId}` });
  }

  const newTask = {
    id: `t${Date.now()}`,
    taskModelId,
    questionId: questionId || null,
    generatedEvidenceIds: generatedEvidenceIds || [],
    generatedObservationIds: generatedObservationIds || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // ✅ Schema validation
  const { valid, errors } = validateEntity("tasks", newTask, db);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  if (!db.tasks) db.tasks = [];
  db.tasks.push(newTask);
  saveDB(db);

  res.status(201).json(newTask);
});

// ------------------------------
// PUT /api/tasks/:id
// ------------------------------
router.put("/:id", (req, res) => {
  const db = loadDB();
  const idx = db.tasks.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Task not found" });

  const updates = req.body;
  const updatedTask = {
    ...db.tasks[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  const { valid, errors } = validateEntity("tasks", updatedTask, db);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  db.tasks[idx] = updatedTask;
  saveDB(db);
  res.json(updatedTask);
});

// ------------------------------
// DELETE /api/tasks/:id
// ------------------------------
router.delete("/:id", (req, res) => {
  const db = loadDB();
  const before = db.tasks.length;
  db.tasks = db.tasks.filter(t => t.id !== req.params.id);
  if (db.tasks.length === before) {
    return res.status(404).json({ error: "Task not found" });
  }

  // Cascade: remove linked sessions
  db.sessions = db.sessions.filter(s => !(s.taskIds || []).includes(req.params.id));

  saveDB(db);
  res.json({ success: true });
});

export default router;
