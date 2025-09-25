import express from "express";
import { loadDB, saveDB } from "../../src/utils/db-server.js";
import { validateEntity } from "../../src/utils/schema.js";  // ✅ schema with metadata-based a/b/c

const router = express.Router();

// ------------------------------
// GET /api/questions
// ------------------------------
router.get("/questions", (req, res) => {
  const db = loadDB();
  res.json(db.questions || []);
});

// ------------------------------
// POST /api/questions
// ------------------------------
router.post("/questions", (req, res) => {
  let {
    stem,
    type,
    options,
    correctOptionId,
    bnObservationId,
    metadata,
    a,
    b,
    c,
  } = req.body;

  if (!stem || !type) {
    return res.status(400).json({ error: "Missing required fields: stem, type" });
  }

  // ❌ Prevent placeholder submissions
  if (type === "default") {
    return res.status(400).json({ error: "Invalid question type: default" });
    }
    
  // ✅ ensure metadata object exists
  metadata = metadata || {};

  // ✅ migrate a/b/c into metadata if present
  if (a !== undefined) metadata.a = a;
  if (b !== undefined) metadata.b = b;
  if (c !== undefined) metadata.c = c;

  const db = loadDB();

  const newQuestion = {
    id: `q${Date.now()}`,
    stem,
    type,
    options: options || [],
    correctOptionId: correctOptionId || null,
    bnObservationId: bnObservationId || null,
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // ✅ Schema validation
  const { valid, errors } = validateEntity("questions", newQuestion);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  if (!db.questions) db.questions = [];
  db.questions.push(newQuestion);
  saveDB(db);

  res.status(201).json(newQuestion);
});

// ------------------------------
// PUT /api/questions/:id
// ------------------------------
router.put("/questions/:id", (req, res) => {
  const { id } = req.params;
  let updates = req.body;

  const db = loadDB();
  if (!db.questions) db.questions = [];
  const idx = db.questions.findIndex((q) => q.id === id);
  if (idx === -1) return res.status(404).json({ error: "Question not found" });

  // ❌ Prevent overwriting with placeholder type
  if (updates.type === "default") {
    return res.status(400).json({ error: "Invalid question type: default" });
  }
    
  // ✅ ensure metadata object exists
  let metadata = updates.metadata || { ...db.questions[idx].metadata };

  // ✅ migrate a/b/c into metadata if present
  if (updates.a !== undefined) metadata.a = updates.a;
  if (updates.b !== undefined) metadata.b = updates.b;
  if (updates.c !== undefined) metadata.c = updates.c;

  // ✅ build updated question
  const updatedQuestion = {
    ...db.questions[idx],
    ...updates,
    metadata,
    updatedAt: new Date().toISOString(),
  };

  // ✅ remove old top-level a/b/c to avoid schema mismatch
  delete updatedQuestion.a;
  delete updatedQuestion.b;
  delete updatedQuestion.c;

  // ✅ Schema validation
  const { valid, errors } = validateEntity("questions", updatedQuestion);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  db.questions[idx] = updatedQuestion;
  saveDB(db);
  res.json(updatedQuestion);
});

// ------------------------------
// DELETE /api/questions/:id
// ------------------------------
router.delete("/questions/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  if (!db.questions) db.questions = [];
  const before = db.questions.length;
  db.questions = db.questions.filter((q) => q.id !== id);
  if (db.questions.length === before) {
    return res.status(404).json({ error: "Question not found" });
  }

  // Cascade: remove from tasks
  if (db.tasks) {
    db.tasks = db.tasks.map((t) => ({
      ...t,
      questionId: t.questionId === id ? null : t.questionId,
    }));
  }

  // Cascade: clean sessions with references
  if (db.sessions) {
    db.sessions = db.sessions.map((s) => ({
      ...s,
      responses: (s.responses || []).filter((r) => r.questionId !== id),
    }));
  }

  saveDB(db);
  res.json({ success: true });
});

export default router;
