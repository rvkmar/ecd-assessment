import express from "express";
import {
  getById,
  update,
  finishSession,
  loadDB,
  saveDB,
} from "../../src/utils/db-server.js"; // adjust path if needed

const router = express.Router();

// ------------------------------
// POST /api/sessions
// ------------------------------
// body: { taskId, studentId }
// returns: { id, ...session }
router.post("/", (req, res) => {
  const { taskId, studentId } = req.body;
  const db = loadDB();

  // Ensure task exists
  const task = db.tasks.find((t) => t.id === taskId);
  if (!task) return res.status(400).json({ error: "Invalid taskId" });

  const newSession = {
    id: `s${Date.now()}`,
    taskId,
    studentId: studentId || null,
    responses: {},
    score: 0,
    constructScores: {},
    scores: [],
    currentTaskIndex: 0,
    isCompleted: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.sessions.push(newSession);
  saveDB(db);

  res.status(201).json(newSession);
});


// ------------------------------
// GET /api/sessions/:id
// ------------------------------
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const session = db.sessions.find((s) => s.id === id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

// ------------------------------
// POST /api/sessions/:id/submit
// ------------------------------
// body: { taskId, answer }
router.post("/:id/submit", (req, res) => {
  const { id } = req.params;
  const { taskId, answer } = req.body;
  const db = loadDB();
  const session = db.sessions.find((s) => s.id === id && !s.isCompleted);

  if (!session) return res.status(404).json({ error: "Session not found" });

  // Save response
  session.responses = session.responses || {};
  session.responses[taskId] = answer;
  session.currentTaskIndex = (session.currentTaskIndex || 0) + 1;
  session.updatedAt = new Date().toISOString();

  saveDB(db);
  res.json(session);
});

// ------------------------------
// GET /api/sessions/:id/next-task
// ------------------------------
router.get("/:id/next-task", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const session = db.sessions.find((s) => s.id === id && !s.isCompleted);
  if (!session) return res.json({});

  const task = db.tasks.find((t) => t.id === session.taskId);
  if (!task) return res.json({});

  const items = db.items.filter((i) => task.itemIds.includes(i.id));

  // Sequential fallback
  if (session.currentTaskIndex < items.length) {
    const nextItem = items[session.currentTaskIndex];
    return res.json({ taskId: nextItem.id });
  }

  return res.json({});
});

// ------------------------------
// POST /api/sessions/:id/finish
// ------------------------------
router.post("/:id/finish", (req, res) => {
  const { id } = req.params;
  const updated = finishSession(id);
  if (!updated) return res.status(404).json({ error: "Session not found" });
  res.json(updated);
});

// ------------------------------
// GET /api/sessions/:id/feedback
// ------------------------------
router.get("/:id/feedback", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const session = db.sessions.find((s) => s.id === id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const constructs = Object.keys(session.constructScores || {}).map((c) => ({
    name: c,
    score:
      session.constructScores[c] /
      Object.keys(session.responses || {}).length,
    level:
      session.constructScores[c] >
      Object.keys(session.responses || {}).length / 2
        ? "Strong"
        : "Needs Work",
  }));

  const recommendations = ["Review weak constructs", "Practice more tasks"];

  res.json({ sessionId: id, constructs, recommendations });
});

export default router;
