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
    if (
      c.competencyId &&
      !db.competencyModels.find((cm) => cm.id === c.competencyId)
    ) {
      return res
        .status(400)
        .json({ error: `Invalid competencyId: ${c.competencyId}` });
    }
  }

  // ✅ Validate rubric.observationId
  const obsIds = new Set((observations || []).map((o) => o.id));
  for (const r of rubrics || []) {
    if (!obsIds.has(r.observationId)) {
      return res
        .status(400)
        .json({ error: `Invalid rubric observationId: ${r.observationId}` });
    }
  }

  // ✅ Validate weights (obsId, rubricId, or rubricId:levelIndex)
  const rubricMap = new Map((rubrics || []).map((r) => [r.id, r.levels || []]));
  const validObsIds = new Set(obsIds);
  const validRubricIds = new Set(rubricMap.keys());

  for (const wId of Object.keys((scoringRule || {}).weights || {})) {
    if (validObsIds.has(wId)) continue;
    if (validRubricIds.has(wId)) continue;

    const [rubricId, lvlIdxStr] = wId.split(":");
    const levels = rubricMap.get(rubricId);
    const idx = parseInt(lvlIdxStr, 10);
    if (levels && !isNaN(idx) && idx >= 0 && idx < levels.length) continue;

    return res.status(400).json({ error: `Invalid weight reference: ${wId}` });
  }

  const newModel = {
    id: `em${Date.now()}`,
    name,
    constructs: (constructs || []).map((c) => ({
      id: c.id || `c${Date.now()}`,
      text: c.text,
      competencyId: c.competencyId || "",
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
  if (idx === -1)
    return res.status(404).json({ error: "Evidence model not found" });

  // ✅ Validate competencyId for constructs
  for (const c of updates.constructs || []) {
    if (
      c.competencyId &&
      !db.competencyModels.find((cm) => cm.id === c.competencyId)
    ) {
      return res
        .status(400)
        .json({ error: `Invalid competencyId: ${c.competencyId}` });
    }
  }

  // ✅ Build sets for construct & observation cleanup
  const remainingConstructIds = new Set(
    (updates.constructs || db.evidenceModels[idx].constructs || []).map(
      (c) => c.id
    )
  );

  // Keep only observations tied to valid constructs
  const cleanedObservations = (
    updates.observations || db.evidenceModels[idx].observations || []
  ).filter((o) => remainingConstructIds.has(o.constructId));

  const remainingObsIds = new Set(cleanedObservations.map((o) => o.id));

  // Keep only rubrics tied to valid observations
  const cleanedRubrics = (
    updates.rubrics || db.evidenceModels[idx].rubrics || []
  ).filter((r) => remainingObsIds.has(r.observationId));

  // ✅ Validate rubrics: each rubric.observationId must exist
  for (const r of cleanedRubrics) {
    if (!remainingObsIds.has(r.observationId)) {
      return res
        .status(400)
        .json({ error: `Invalid rubric observationId: ${r.observationId}` });
    }
  }

  // ✅ Cascade cleanup: weights
  const rubricMap = new Map(cleanedRubrics.map((r) => [r.id, r.levels || []]));
  const validRubricIds = new Set(rubricMap.keys());

  let cleanedWeights = {};
  const rawWeights =
    (updates.scoringRule || db.evidenceModels[idx].scoringRule || {}).weights ||
    {};

  for (const [wId, w] of Object.entries(rawWeights)) {
    if (remainingObsIds.has(wId)) {
      cleanedWeights[wId] = w; // observation-level
    } else if (validRubricIds.has(wId)) {
      cleanedWeights[wId] = w; // rubric-level
    } else {
      // rubric-level weight: rubricId:levelIndex
      const [rubricId, lvlIdxStr] = wId.split(":");
      const levels = rubricMap.get(rubricId);
      const idx = parseInt(lvlIdxStr, 10);
      if (levels && !isNaN(idx) && idx >= 0 && idx < levels.length) {
        cleanedWeights[wId] = w;
      }
    }
  }

  const updatedModel = {
    ...db.evidenceModels[idx],
    ...updates,
    constructs: (
      updates.constructs || db.evidenceModels[idx].constructs || []
    ).map((c) => ({
      id: c.id || `c${Date.now()}`,
      text: c.text,
      competencyId: c.competencyId || "",
    })),
    observations: cleanedObservations,
    rubrics: cleanedRubrics,
    scoringRule: {
      ...(updates.scoringRule || db.evidenceModels[idx].scoringRule || {}),
      weights: cleanedWeights,
    },
  };

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
