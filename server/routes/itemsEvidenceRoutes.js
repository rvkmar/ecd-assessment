import express from "express";
import { loadDB, saveDB } from "../../src/utils/db-server.js";

const router = express.Router();

// ------------------------------
// GET /api/items
// ------------------------------
router.get("/items", (req, res) => {
  const db = loadDB();
  res.json(db.items || []);
});

// ------------------------------
// POST /api/items
// ------------------------------
// body: { text, type, choices, correct, observationId }
router.post("/items", (req, res) => {
  const { text, type, choices, correct, observationId } = req.body;
  const db = loadDB();

  const newItem = {
    id: `i${Date.now()}`,
    text,
    type: type || "simple",
    choices: choices || [],
    correct: correct || null,
    observationId: observationId || null, // for rubric items
  };

  db.items.push(newItem);
  saveDB(db);
  res.status(201).json(newItem);
});

// ------------------------------
// PUT /api/items/:id
// ------------------------------
// body can include: { text, type, choices, correct, observationId }
router.put("/items/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = loadDB();
  const idx = db.items.findIndex((i) => i.id === id);
  if (idx === -1) return res.status(404).json({ error: "Item not found" });

  db.items[idx] = { ...db.items[idx], ...updates };
  saveDB(db);
  res.json(db.items[idx]);
});

// ------------------------------
// DELETE /api/items/:id
// ------------------------------
// Cascade delete: remove item, update tasks and sessions
router.delete("/items/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  const before = db.items.length;
  db.items = db.items.filter((i) => i.id !== id);
  if (db.items.length === before) {
    return res.status(404).json({ error: "Item not found" });
  }

  // Cascade: remove from tasks
  db.tasks = db.tasks.map((t) => ({
    ...t,
    itemIds: t.itemIds.filter((iid) => iid !== id),
  }));

  // Cascade: clean sessions with references
  db.sessions = db.sessions.map((s) => {
    const { [id]: removed, ...remaining } = s.responses || {};
    return { ...s, responses: remaining };
  });

  saveDB(db);
  res.json({ success: true });
});

// ------------------------------
// GET /api/evidenceModels
// ------------------------------
router.get("/evidenceModels", (req, res) => {
  const db = loadDB();
  res.json(db.evidenceModels || []);
});

// ------------------------------
// POST /api/evidenceModels
// ------------------------------
router.post("/evidenceModels", (req, res) => {
  const { name, constructs, observations, rubrics, scoringRule } = req.body;
  const db = loadDB();

  // ✅ Validate competencyId for constructs
  for (const c of constructs || []) {
    if (c.competencyId && !db.competencyModels.find(cm => cm.id === c.competencyId)) {
      return res.status(400).json({ error: `Invalid competencyId: ${c.competencyId}` });
    }
  }

  const newModel = {
    id: `em${Date.now()}`,
    name,
    constructs: (constructs || []).map(c => ({
      id: c.id || `c${Date.now()}`,
      text: c.text,
      competencyId: c.competencyId || ""   // ✅ store competency link
    })),
    observations: observations || [],
    rubrics: rubrics || [],
    scoringRule: scoringRule || {},
    modelLabel: `em${(db.evidenceModels || []).length + 1}`,
    confirmed: false,
  };

  db.evidenceModels.push(newModel);
  saveDB(db);
  res.status(201).json(newModel);
});

// ------------------------------
// PUT /api/evidenceModels/:id
// ------------------------------
router.put("/evidenceModels/:id", (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const db = loadDB();

  const idx = db.evidenceModels.findIndex((m) => m.id === id);
  if (idx === -1) return res.status(404).json({ error: "Evidence model not found" });

  // ✅ Validate competencyId for constructs
  for (const c of updates.constructs || []) {
    if (c.competencyId && !db.competencyModels.find(cm => cm.id === c.competencyId)) {
      return res.status(400).json({ error: `Invalid competencyId: ${c.competencyId}` });
    }
  }

  // Merge updates and normalize constructs
  const updatedModel = {
    ...db.evidenceModels[idx],
    ...updates,
    constructs: (updates.constructs || db.evidenceModels[idx].constructs || []).map(c => ({
      id: c.id || `c${Date.now()}`,
      text: c.text,
      competencyId: c.competencyId || ""   // ✅ ensure competencyId persists
    }))
  };

  if (!updatedModel.scoringRule) {
    updatedModel.scoringRule = {};
  }

  db.evidenceModels[idx] = updatedModel;
  saveDB(db);

  res.json(updatedModel);
});

// ------------------------------
// DELETE /api/evidenceModels/:id
// ------------------------------
// Cascade delete: remove evidence model and update tasks/sessions
router.delete("/evidenceModels/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  const before = db.evidenceModels.length;
  db.evidenceModels = db.evidenceModels.filter((m) => m.id !== id);
  if (db.evidenceModels.length === before) {
    return res.status(404).json({ error: "Evidence model not found" });
  }

  // Cascade: remove tasks using this model
  const removedTaskIds = db.tasks
    .filter((t) => t.evidenceModelId === id)
    .map((t) => t.id);
  db.tasks = db.tasks.filter((t) => t.evidenceModelId !== id);

  // Cascade: remove sessions linked to removed tasks
  db.sessions = db.sessions.filter((s) => !removedTaskIds.includes(s.taskId));

  saveDB(db);
  res.json({ success: true });
});

export default router;