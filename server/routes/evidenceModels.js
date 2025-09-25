import express from "express";
import { loadDB, saveDB } from "../../src/utils/db-server.js";

const router = express.Router();

// ------------------------------
// GET /api/evidenceModels
// ------------------------------
router.get("/", (req, res) => {
  const db = loadDB();
  res.json(db.evidenceModels || []);
});

// ------------------------------
// POST /api/evidenceModels
// ------------------------------
router.post("/", (req, res) => {
  const { name, constructs, observations, rubrics, scoringRule } = req.body;
  const db = loadDB();

  // ✅ Validate competencyId for constructs
  for (const c of constructs || []) {
    if (c.competencyId && !db.competencyModels.find(cm => cm.id === c.competencyId)) {
      return res.status(400).json({ error: `Invalid competencyId: ${c.competencyId}` });
    }
  }

  // ✅ Validate weights
  const obsIds = new Set((observations || []).map(o => o.id));
  const weights = (scoringRule || {}).weights || {};
  for (const wId of Object.keys(weights)) {
    if (!obsIds.has(wId)) {
      return res.status(400).json({ error: `Invalid weight reference: ${wId}` });
    }
  }

  // ✅ Validate rubrics: each rubric.observationId must exist in observations
  for (const r of rubrics || []) {
    if (!obsIds.has(r.observationId)) {
      return res.status(400).json({ error: `Invalid rubric observationId: ${r.observationId}` });
    }
  }

  const newModel = {
    id: `em${Date.now()}`,
    name,
    constructs: (constructs || []).map(c => ({
      id: c.id || `c${Date.now()}`,
      text: c.text,
      competencyId: c.competencyId || ""
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
router.put("/:id", (req, res) => {
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

  // ✅ Validate weights against updated or existing observations
  const obsIds = new Set((updates.observations || db.evidenceModels[idx].observations || []).map(o => o.id));
  const weights = (updates.scoringRule || {}).weights || {};
  for (const wId of Object.keys(weights)) {
    if (!obsIds.has(wId)) {
      return res.status(400).json({ error: `Invalid weight reference: ${wId}` });
    }
  }

  // ✅ Validate rubrics: each rubric.observationId must exist in observations
  for (const r of updates.rubrics || []) {
    if (!obsIds.has(r.observationId)) {
      return res.status(400).json({ error: `Invalid rubric observationId: ${r.observationId}` });
    }
  }

  // ✅ Build sets for construct & observation cleanup
  const remainingConstructIds = new Set(
    (updates.constructs || db.evidenceModels[idx].constructs || []).map(c => c.id)
  );

  // Keep only observations whose construct still exists
  const cleanedObservations = (updates.observations || db.evidenceModels[idx].observations || [])
    .filter(o => remainingConstructIds.has(o.constructId));

  // Update obsIds set for cascading
  const remainingObsIds = new Set(cleanedObservations.map(o => o.id));

  // Clean rubrics (only those tied to valid observations)
  const cleanedRubrics = (updates.rubrics || db.evidenceModels[idx].rubrics || [])
    .filter(r => remainingObsIds.has(r.observationId));

  // Clean weights (only those tied to valid observations)
  let cleanedWeights = {};
  const rawWeights = (updates.scoringRule || db.evidenceModels[idx].scoringRule || {}).weights || {};
  for (const [obsId, w] of Object.entries(rawWeights)) {
    if (remainingObsIds.has(obsId)) {
      cleanedWeights[obsId] = w;
    }
  }

  const updatedModel = {
    ...db.evidenceModels[idx],
    ...updates,
    constructs: (updates.constructs || db.evidenceModels[idx].constructs || []).map(c => ({
      id: c.id || `c${Date.now()}`,
      text: c.text,
      competencyId: c.competencyId || ""
    })),
    observations: cleanedObservations,
    rubrics: cleanedRubrics,
    scoringRule: {
      ...(updates.scoringRule || db.evidenceModels[idx].scoringRule || {}),
      weights: cleanedWeights,
    },
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
router.delete("/:id", (req, res) => {
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
