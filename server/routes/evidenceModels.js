// server/routes/evidenceModels.js
import express from "express";
import { loadDB, saveDB } from "../../src/utils/db-server.js";
import { validateEntity } from "../../src/utils/schema.js";

const router = express.Router();

// helpers
const genId = (prefix = "id") => `${prefix}${Date.now()}`;

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
// body: { name, description?, evidences?, constructs?, observations?, rubrics?, measurementModel? }
router.post("/", (req, res) => {
  const db = loadDB();
  const { name, description, evidences, constructs, observations, rubrics, measurementModel } = req.body;

  // Basic required name
  if (!name) return res.status(400).json({ error: "name is required" });

  // Normalize arrays and ensure ids exist
  const evidencesNorm = (evidences || []).map((e) => ({
    id: e.id || genId("ev"),
    description: e.description || e.text || "",
    ...e,
  }));

  const evidenceIdSet = new Set(evidencesNorm.map((e) => e.id));

  const constructsNorm = (constructs || []).map((c) => ({
    id: c.id || genId("c"),
    text: c.text || "",
    competencyId: c.competencyId || "",
    evidenceId: c.evidenceId || "",
  }));

  // Validate constructs reference evidenceIds + competencyIds (if db provided)
  for (const c of constructsNorm) {
    if (!c.evidenceId) {
      return res.status(400).json({ error: `Construct ${c.id} is missing evidenceId` });
    }
    if (!evidenceIdSet.has(c.evidenceId)) {
      return res.status(400).json({ error: `Construct ${c.id} references invalid evidenceId: ${c.evidenceId}` });
    }
    if (!c.competencyId) {
      return res.status(400).json({ error: `Construct ${c.id} is missing competencyId` });
    }
    if (!db.competencyModels?.find((cm) => cm.id === c.competencyId)) {
      return res.status(400).json({ error: `Construct ${c.id} references invalid competencyId: ${c.competencyId}` });
    }
  }

  // Observations: include linkedQuestionIds, rubric info, constructId
  const observationsNorm = (observations || []).map((o) => ({
    id: o.id || genId("o"),
    text: o.text || o.description || "",
    constructId: o.constructId || "",
    type: o.type || "other",
    linkedQuestionIds: o.linkedQuestionIds || [],
    rubric: o.rubric || null,
    scoring: o.scoring || null,
    createdAt: o.createdAt || new Date().toISOString(),
    updatedAt: o.updatedAt || new Date().toISOString(),
  }));

  // Validate that each observation's constructId exists among constructs
  const constructIdSet = new Set(constructsNorm.map((c) => c.id));
  for (const o of observationsNorm) {
    if (!o.constructId) {
      return res.status(400).json({ error: `Observation ${o.id} is missing constructId` });
    }
    if (!constructIdSet.has(o.constructId)) {
      return res.status(400).json({ error: `Observation ${o.id} references invalid constructId: ${o.constructId}` });
    }
    if (o.type === "rubric") {
      if (!o.rubric || !Array.isArray(o.rubric.levels) || o.rubric.levels.length === 0) {
        return res.status(400).json({ error: `Observation ${o.id} is type rubric but missing rubric.levels` });
      }
    }
    // If linkedQuestionIds provided, check existence in db.questions
    for (const qid of o.linkedQuestionIds || []) {
      if (!db.questions?.find((q) => q.id === qid)) {
        return res.status(400).json({ error: `Observation ${o.id} linkedQuestionId invalid: ${qid}` });
      }
    }
  }

  // Rubrics: separate collection referencing observations
  const rubricsNorm = (rubrics || []).map((r) => ({
    id: r.id || genId("r"),
    observationId: r.observationId || "",
    levels: r.levels || [],
  }));

  const observationIdSet = new Set(observationsNorm.map((o) => o.id));
  for (const r of rubricsNorm) {
    if (!r.observationId) {
      return res.status(400).json({ error: `Rubric ${r.id} missing observationId` });
    }
    if (!observationIdSet.has(r.observationId)) {
      return res.status(400).json({ error: `Rubric ${r.id} references invalid observationId: ${r.observationId}` });
    }
    if (!Array.isArray(r.levels) || r.levels.length === 0) {
      return res.status(400).json({ error: `Rubric ${r.id} must have levels` });
    }
  }

  // Validate measurementModel weights (if any)
  const rubricMap = new Map(); // observationId -> levels array
  for (const o of observationsNorm) {
    if (o.type === "rubric") {
      rubricMap.set(o.id, o.rubric?.levels || []);
    }
  }
  const validObsIds = new Set(observationsNorm.map((o) => o.id));
  const validRubricIds = new Set(rubricsNorm.map((r) => r.id));

  const cleanedMeasurementModel = measurementModel ? { ...measurementModel } : { type: "sum", weights: {} };
  cleanedMeasurementModel.weights = cleanedMeasurementModel.weights || {};

  for (const wId of Object.keys(cleanedMeasurementModel.weights || {})) {
    if (validObsIds.has(wId)) continue; // observation-level weight
    if (validRubricIds.has(wId)) continue; // rubric-level (by rubric id)
    // check rubric-level key like "rubricId:levelIndex"
    const [rubricId, lvlIdxStr] = wId.split(":");
    const levels = rubricMap.get(rubricId) || (rubricsNorm.find(r => r.id === rubricId)?.levels || []);
    const idx = parseInt(lvlIdxStr, 10);
    if (levels && !isNaN(idx) && idx >= 0 && idx < levels.length) continue;

    return res.status(400).json({ error: `Invalid measurementModel weight key: ${wId}` });
  }

  // Build the model
  const newModel = {
    id: `em${Date.now()}`,
    name,
    description: description || "",
    evidences: evidencesNorm,
    constructs: constructsNorm,
    observations: observationsNorm,
    rubrics: rubricsNorm,
    measurementModel: cleanedMeasurementModel,
    modelLabel: `em${(db.evidenceModels || []).length + 1}`,
    confirmed: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Final schema validation
  const { valid, errors } = validateEntity("evidenceModels", newModel, db);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  db.evidenceModels = db.evidenceModels || [];
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

  const existing = db.evidenceModels[idx];

  // Merge incoming arrays carefully, regenerate ids where needed
  const evidencesIn = updates.evidences || existing.evidences || [];
  const evidencesNorm = evidencesIn.map((e) => ({ id: e.id || genId("ev"), description: e.description || e.text || "", ...e }));

  const evidenceIdSet = new Set(evidencesNorm.map((e) => e.id));

  const constructsIn = updates.constructs || existing.constructs || [];
  const constructsNorm = constructsIn.map((c) => ({
    id: c.id || genId("c"),
    text: c.text || "",
    competencyId: c.competencyId || "",
    evidenceId: c.evidenceId || "",
  }));

  // Validate constructs
  for (const c of constructsNorm) {
    if (!c.evidenceId) return res.status(400).json({ error: `Construct ${c.id} is missing evidenceId` });
    if (!evidenceIdSet.has(c.evidenceId)) return res.status(400).json({ error: `Construct ${c.id} references invalid evidenceId: ${c.evidenceId}` });
    if (!c.competencyId) return res.status(400).json({ error: `Construct ${c.id} is missing competencyId` });
    if (!db.competencyModels?.find((cm) => cm.id === c.competencyId)) {
      return res.status(400).json({ error: `Construct ${c.id} references invalid competencyId: ${c.competencyId}` });
    }
  }

  // Observations: keep only those belonging to kept constructs
  const observationsIn = updates.observations || existing.observations || [];
  const remainingConstructIds = new Set(constructsNorm.map((c) => c.id));
  const observationsCleaned = (observationsIn || []).filter((o) => remainingConstructIds.has(o.constructId)).map((o) => ({
    id: o.id || genId("o"),
    text: o.text || o.description || "",
    constructId: o.constructId,
    type: o.type || "other",
    linkedQuestionIds: o.linkedQuestionIds || [],
    rubric: o.rubric || null,
    scoring: o.scoring || null,
    createdAt: o.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  // Remove rubrics that reference removed observations
  const rubricsIn = updates.rubrics || existing.rubrics || [];
  const remainingObsIds = new Set(observationsCleaned.map((o) => o.id));
  const rubricsCleaned = (rubricsIn || []).filter((r) => remainingObsIds.has(r.observationId)).map((r) => ({
    id: r.id || genId("r"),
    observationId: r.observationId,
    levels: r.levels || [],
  }));

  // Validate rubrics point to valid observations
  for (const r of rubricsCleaned) {
    if (!remainingObsIds.has(r.observationId)) {
      return res.status(400).json({ error: `Rubric ${r.id} references invalid observationId: ${r.observationId}` });
    }
    if (!Array.isArray(r.levels) || r.levels.length === 0) {
      return res.status(400).json({ error: `Rubric ${r.id} must have at least one level` });
    }
  }

  // Rebuild rubric map for measurement weight validation
  const rubricMap = new Map(); // rubricId -> levels
  for (const r of rubricsCleaned) {
    rubricMap.set(r.id, r.levels || []);
  }
  // Also add observation-level rubric entries from observation.rubric if present
  for (const o of observationsCleaned) {
    if (o.type === "rubric" && o.rubric?.levels) rubricMap.set(o.id, o.rubric.levels);
  }

  // Clean measurementModel.weights
  const rawMeasurement = updates.measurementModel || existing.measurementModel || { type: "sum", weights: {} };
  const rawWeights = rawMeasurement.weights || {};
  let cleanedWeights = {};
  const validObsIds = new Set(observationsCleaned.map((o) => o.id));
  const validRubricIds = new Set(rubricsCleaned.map((r) => r.id));

  for (const [wId, wVal] of Object.entries(rawWeights)) {
    if (validObsIds.has(wId)) {
      cleanedWeights[wId] = wVal;
      continue;
    }
    if (validRubricIds.has(wId)) {
      cleanedWeights[wId] = wVal;
      continue;
    }
    const [rubricId, lvlIdxStr] = wId.split(":");
    const levels = rubricMap.get(rubricId);
    const idx = parseInt(lvlIdxStr, 10);
    if (levels && !isNaN(idx) && idx >= 0 && idx < levels.length) {
      cleanedWeights[wId] = wVal;
      continue;
    }
    // else ignore invalid weight key (do not crash) — or return error (choose strict)
    return res.status(400).json({ error: `Invalid measurementModel weight key: ${wId}` });
  }

  const updatedModel = {
    ...existing,
    ...updates,
    evidences: evidencesNorm,
    constructs: constructsNorm,
    observations: observationsCleaned,
    rubrics: rubricsCleaned,
    measurementModel: {
      ...(rawMeasurement || {}),
      weights: cleanedWeights,
    },
    updatedAt: new Date().toISOString(),
  };

  // Final validation
  const { valid, errors } = validateEntity("evidenceModels", updatedModel, db);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
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

  const before = db.evidenceModels.length || 0;
  db.evidenceModels = (db.evidenceModels || []).filter((m) => m.id !== id);
  if ((db.evidenceModels || []).length === before) {
    return res.status(404).json({ error: "Evidence model not found" });
  }

  // Cascade: remove tasks using this model (tasks.taskModelId may reference task models; historically some task may hold evidenceModelId)
  const removedTaskIds = (db.tasks || []).filter((t) => t.evidenceModelId === id).map((t) => t.id);
  db.tasks = (db.tasks || []).filter((t) => t.evidenceModelId !== id);

  // Cascade: remove sessions referencing removed tasks
  db.sessions = (db.sessions || []).filter((s) => !((s.taskIds || []).some((tid) => removedTaskIds.includes(tid))));

  saveDB(db);
  res.json({ success: true });
});

export default router;
