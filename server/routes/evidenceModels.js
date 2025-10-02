// server/routes/evidenceModels.js (full patched with rubric criteria + restored cascade + full validation)
import express from "express";
import { loadDB, saveDB } from "../../src/utils/db-server.js";
import { validateEntity } from "../../src/utils/schema.js";

const router = express.Router();

// helpers
const genId = (prefix = "id") => `${prefix}${Date.now()}`;

// Allowed enums for observation scoring methods
const allowedScoringMethods = [
  "binary",
  "partial",
  "rubric",
  "numeric",
  "likert",
  "performance",
  "custom",
  ];

// Normalize rubric (support criteria)
const normalizeRubric = (r) => {
  const base = {
    id: r.id || genId("r"),
    observationId: r.observationId || "",
    name: r.name || "",
    description: r.description || "",
    criteria: Array.isArray(r.criteria) ? r.criteria : [],
    levels: Array.isArray(r.levels) ? r.levels : [],
  };
  if (base.criteria && base.criteria.length > 0) {
    const flattened = [];
    for (const c of base.criteria) {
      if (!Array.isArray(c.levels)) continue;
      for (const l of c.levels) {
        if (l && l.name) flattened.push(l.name);
      }
    }
    base.levels = flattened;
  }
  return base;
};

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
  const db = loadDB();
  const { name, description, evidences, constructs, observations, rubrics, measurementModel } = req.body;

  if (!name || name.trim() === "") return res.status(400).json({ error: "name is required" });

  // Normalize observations
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

  // Validate observation types & scoring methods
  for (const o of observationsNorm) {
    if (![
    "selected_response",
    "open_response",
    "rubric",
    "numeric",
    "performance",
    "artifact",
    "behavior",
    "other"
    ].includes(o.type)) {
      return res.status(400).json({ error: `Observation ${o.id} has invalid type: ${o.type}` });
      }
    if (o.scoring && o.scoring.method && !allowedScoringMethods.includes(o.scoring.method)) {
      return res.status(400).json({ error: `Observation ${o.id} has invalid scoring method: ${o.scoring.method}` });
      }
  }

  const evidencesNorm = (evidences || []).map((e) => ({ id: e.id || genId("ev"), description: e.description || e.text || "", ...e }));
  const evidenceIdSet = new Set(evidencesNorm.map((e) => e.id));

  const constructsNorm = (constructs || []).map((c) => ({ id: c.id || genId("c"), text: c.text || "", competencyId: c.competencyId || "", evidenceId: c.evidenceId || "" }));
  for (const c of constructsNorm) {
    if (!c.evidenceId) return res.status(400).json({ error: `Construct ${c.id} is missing evidenceId` });
    if (!evidenceIdSet.has(c.evidenceId)) return res.status(400).json({ error: `Construct ${c.id} references invalid evidenceId: ${c.evidenceId}` });
    if (!c.competencyId) return res.status(400).json({ error: `Construct ${c.id} is missing competencyId` });
    const comp = db.competencies?.find((co) => co.id === c.competencyId);
    if (!comp) return res.status(400).json({ error: `Construct ${c.id} references invalid competencyId: ${c.competencyId}` });
    const model = db.competencyModels?.find((m) => m.id === comp.modelId);
    if (!model) return res.status(400).json({ error: `Construct ${c.id} references competency ${c.competencyId} with no valid modelId: ${comp.modelId}` });
  }

  // const observationsNorm = (observations || []).map((o) => ({
  //   id: o.id || genId("o"),
  //   text: o.text || o.description || "",
  //   constructId: o.constructId || "",
  //   type: o.type || "other",
  //   linkedQuestionIds: o.linkedQuestionIds || [],
  //   rubric: o.rubric || null,
  //   scoring: o.scoring || null,
  //   createdAt: o.createdAt || new Date().toISOString(),
  //   updatedAt: o.updatedAt || new Date().toISOString(),
  // }));

  const constructIdSet = new Set(constructsNorm.map((c) => c.id));
  for (const o of observationsNorm) {
    if (![
      "selected_response",
      "open_response",
      "rubric",
      "numeric",
      "performance",
      "artifact",
      "behavior",
      "other"
    ].includes(o.type)) {
      return res.status(400).json({ error: `Observation ${o.id} has invalid type: ${o.type}` });
    }

    if (!o.constructId) return res.status(400).json({ error: `Observation ${o.id} is missing constructId` });
    if (!constructIdSet.has(o.constructId)) return res.status(400).json({ error: `Observation ${o.id} references invalid constructId: ${o.constructId}` });
    if (o.type === "rubric") {
      if (!o.rubric || !Array.isArray(o.rubric.levels) || o.rubric.levels.length === 0) {
        return res.status(400).json({ error: `Observation ${o.id} is type rubric but missing rubric.levels` });
      }
    }

    for (const qid of o.linkedQuestionIds || []) {
      const q = db.questions?.find((q) => q.id === qid);
      if (!q) {
        return res.status(400).json({ error: `Observation ${o.id} linkedQuestionId invalid: ${qid}` });
      }
      // 🔒 Strict ECD: enforce only for selected_response & open_response
      if (o.type === "selected_response" && q.type !== "mcq") {
        return res.status(400).json({ error: `Observation ${o.id} is selected_response but linked question ${qid} is ${q.type}` });
      }
      if (o.type === "open_response" && q.type !== "constructed") {
        return res.status(400).json({ error: `Observation ${o.id} is open_response but linked question ${qid} is ${q.type}` });
      }
      // rubric/numeric/performance/artifact/behavior/other → no strict enforcement
    }
  }

  const rubricsNorm = (rubrics || []).map((r) => normalizeRubric(r));
  const observationIdSet = new Set(observationsNorm.map((o) => o.id));
  for (const r of rubricsNorm) {
    if (!r.observationId) return res.status(400).json({ error: `Rubric ${r.id} missing observationId` });
    if (!observationIdSet.has(r.observationId)) return res.status(400).json({ error: `Rubric ${r.id} references invalid observationId: ${r.observationId}` });
    if ((!Array.isArray(r.levels) || r.levels.length === 0) && (!Array.isArray(r.criteria) || r.criteria.length === 0)) {
      return res.status(400).json({ error: `Rubric ${r.id} must have levels or criteria` });
    }
    if (Array.isArray(r.criteria)) {
      for (const c of r.criteria) {
        if (!c.name || c.name.trim() === "") return res.status(400).json({ error: `Criterion in rubric ${r.id} missing name` });
        if (!Array.isArray(c.levels) || c.levels.length === 0) return res.status(400).json({ error: `Criterion ${c.name} in rubric ${r.id} must have at least one level` });
        for (const l of c.levels) {
          if (!l.name || l.name.trim() === "") return res.status(400).json({ error: `Level in criterion ${c.name} of rubric ${r.id} missing name` });
          if (l.score !== undefined && typeof l.score !== "number") return res.status(400).json({ error: `Score for level ${l.name} in rubric ${r.id} must be a number` });
        }
      }
    }
  }

  const rubricMap = new Map();
  for (const o of observationsNorm) {
    if (o.type === "rubric") rubricMap.set(o.id, o.rubric?.levels || []);
  }
  const validObsIds = new Set(observationsNorm.map((o) => o.id));
  const validRubricIds = new Set(rubricsNorm.map((r) => r.id));
  const cleanedMeasurementModel = measurementModel ? { ...measurementModel } : { type: "sum", weights: {} };
  cleanedMeasurementModel.weights = cleanedMeasurementModel.weights || {};
  for (const wId of Object.keys(cleanedMeasurementModel.weights)) {
    if (validObsIds.has(wId)) continue;
    if (validRubricIds.has(wId)) continue;
    const [rubricId, lvlIdxStr] = wId.split(":");
    const levels = rubricMap.get(rubricId) || (rubricsNorm.find(r => r.id === rubricId)?.levels || []);
    const idx = parseInt(lvlIdxStr, 10);
    if (levels && !isNaN(idx) && idx >= 0 && idx < levels.length) continue;
    return res.status(400).json({ error: `Invalid measurementModel weight key: ${wId}` });
  }

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
  const { valid, errors } = validateEntity("evidenceModels", newModel, db);
  if (!valid) return res.status(400).json({ error: "Schema validation failed", details: errors });

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

  // Normalize observations
  const observationsIn = updates.observations || existing.observations || [];
  const observationsCleaned = observationsIn.map((o) => ({
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

    // Validate observation types & scoring methods
    for (const o of observationsCleaned) {
      if (![
      "selected_response",
      "open_response",
      "rubric",
      "numeric",
      "performance",
      "artifact",
      "behavior",
      "other"
      ].includes(o.type)) {
        return res.status(400).json({ error: `Observation ${o.id} has invalid type: ${o.type}` });
      }
      if (o.scoring && o.scoring.method && !allowedScoringMethods.includes(o.scoring.method)) {
        return res.status(400).json({ error: `Observation ${o.id} has invalid scoring method: ${o.scoring.method}` });
      }
    }

  // Normalize evidences
  const evidencesIn = updates.evidences || existing.evidences || [];
  const evidencesNorm = evidencesIn.map((e) => ({ id: e.id || genId("ev"), description: e.description || e.text || "", ...e }));

  const evidenceIdSet = new Set(evidencesNorm.map((e) => e.id));

  // Normalize constructs
  const constructsIn = updates.constructs || existing.constructs || [];
  const constructsNorm = constructsIn.map((c) => ({ id: c.id || genId("c"), text: c.text || "", competencyId: c.competencyId || "", evidenceId: c.evidenceId || "" }));
  for (const c of constructsNorm) {
    if (!c.evidenceId) return res.status(400).json({ error: `Construct ${c.id} is missing evidenceId` });
    if (!evidenceIdSet.has(c.evidenceId)) return res.status(400).json({ error: `Construct ${c.id} references invalid evidenceId: ${c.evidenceId}` });
    if (!c.competencyId) return res.status(400).json({ error: `Construct ${c.id} is missing competencyId` });
    const comp = db.competencies?.find((co) => co.id === c.competencyId);
    if (!comp) return res.status(400).json({ error: `Construct ${c.id} references invalid competencyId: ${c.competencyId}` });
    const model = db.competencyModels?.find((m) => m.id === comp.modelId);
    if (!model) return res.status(400).json({ error: `Construct ${c.id} references competency ${c.competencyId} with invalid modelId: ${comp.modelId}` });
  }

  // Normalize observations
  // const observationsIn = updates.observations || existing.observations || [];
  // const observationsCleaned = observationsIn.map((o) => ({
  //   id: o.id || genId("o"),
  //   text: o.text || o.description || "",
  //   constructId: o.constructId,
  //   type: o.type || "other",
  //   linkedQuestionIds: o.linkedQuestionIds || [],
  //   rubric: o.rubric || null,
  //   scoring: o.scoring || null,
  //   createdAt: o.createdAt || new Date().toISOString(),
  //   updatedAt: new Date().toISOString(),
  // }));

  // for (const o of observationsCleaned) {
  //   if (![
  //     "selected_response",
  //     "open_response",
  //     "rubric",
  //     "numeric",
  //     "performance",
  //     "artifact",
  //     "behavior",
  //     "other"
  //   ].includes(o.type)) {
  //     return res.status(400).json({ error: `Observation ${o.id} has invalid type: ${o.type}` });
  //   }
  // }

  // 🔒 Strict ECD: validate observation.type vs linked question.type
  for (const o of observationsCleaned) {
    for (const qid of o.linkedQuestionIds || []) {
      const q = db.questions?.find((q) => q.id === qid);
      if (!q) {
        return res.status(400).json({ error: `Observation ${o.id} linkedQuestionId invalid: ${qid}` });
      }
      // 🔒 Strict ECD: enforce only for selected_response & open_response
      if (o.type === "selected_response" && q.type !== "mcq") {
        return res.status(400).json({
          error: `Observation ${o.id} is selected_response but linked question ${qid} is ${q.type}`
        });
      }
      if (o.type === "open_response" && q.type !== "constructed") {
        return res.status(400).json({
          error: `Observation ${o.id} is open_response but linked question ${qid} is ${q.type}`
        });
      }
      // rubric/numeric/performance/artifact/behavior/other → no strict enforcement
    }
  }

  // Normalize rubrics
  const rubricsIn = updates.rubrics || existing.rubrics || [];
  const rubricsCleaned = rubricsIn.map((r) => normalizeRubric(r));

  // Validate rubrics
  const remainingObsIds = new Set(observationsCleaned.map((o) => o.id));
  for (const r of rubricsCleaned) {
    if (!r.observationId) return res.status(400).json({ error: `Rubric ${r.id} missing observationId` });
    if (!remainingObsIds.has(r.observationId)) return res.status(400).json({ error: `Rubric ${r.id} references invalid observationId: ${r.observationId}` });
    if ((!Array.isArray(r.levels) || r.levels.length === 0) && (!Array.isArray(r.criteria) || r.criteria.length === 0)) {
      return res.status(400).json({ error: `Rubric ${r.id} must have levels or criteria` });
    }
    if (Array.isArray(r.criteria)) {
      for (const c of r.criteria) {
        if (!c.name || c.name.trim() === "") return res.status(400).json({ error: `Criterion in rubric ${r.id} missing name` });
        if (!Array.isArray(c.levels) || c.levels.length === 0) return res.status(400).json({ error: `Criterion ${c.name} in rubric ${r.id} must have at least one level` });
        for (const l of c.levels) {
          if (!l.name || l.name.trim() === "") return res.status(400).json({ error: `Level in criterion ${c.name} of rubric ${r.id} missing name` });
          if (l.score !== undefined && typeof l.score !== "number") return res.status(400).json({ error: `Score for level ${l.name} in rubric ${r.id} must be a number` });
        }
      }
    }
  }

  // Measurement model validation
  const rubricMap = new Map();
  for (const r of rubricsCleaned) {
    if (Array.isArray(r.levels)) rubricMap.set(r.id, r.levels);
  }
  const validObsIds = new Set(observationsCleaned.map((o) => o.id));
  const validRubricIds = new Set(rubricsCleaned.map((r) => r.id));

  const rawMeasurement = updates.measurementModel || existing.measurementModel || { type: "sum", weights: {} };
  const rawWeights = rawMeasurement.weights || {};
  const cleanedWeights = {};

  for (const [wId, wVal] of Object.entries(rawWeights)) {
    if (validObsIds.has(wId)) { cleanedWeights[wId] = wVal; continue; }
    if (validRubricIds.has(wId)) { cleanedWeights[wId] = wVal; continue; }
    const [rubricId, lvlIdxStr] = wId.split(":");
    const levels = rubricMap.get(rubricId);
    const idx = parseInt(lvlIdxStr, 10);
    if (levels && !isNaN(idx) && idx >= 0 && idx < levels.length) { cleanedWeights[wId] = wVal; continue; }
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

  const { valid, errors } = validateEntity("evidenceModels", updatedModel, db);
  if (!valid) return res.status(400).json({ error: "Schema validation failed", details: errors });

  db.evidenceModels[idx] = updatedModel;
  saveDB(db);
  res.json(updatedModel);
});
// ------------------------------
// DELETE /api/evidenceModels/:id (with cascade cleanup)
// ------------------------------
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  const before = (db.evidenceModels || []).length;
  const model = (db.evidenceModels || []).find((m) => m.id === id);
  if (!model) return res.status(404).json({ error: "Evidence model not found" });

  // Cascade deletion strategy:
  // 1. Remove tasks that reference this evidence model via taskModels or itemMappings
  // 2. Remove sessions that reference those tasks
  // 3. Remove the evidence model

  // Find taskModels that reference this evidence model (taskModel.evidenceModelId)
  const affectedTaskModelIds = (db.taskModels || [])
    .filter((tm) => tm.evidenceModelId === id)
    .map((tm) => tm.id);

  // Find tasks that use those taskModels OR whose itemMappings reference observations in this model
  const observationIds = new Set((model.observations || []).map((o) => o.id));

  const affectedTaskIds = new Set();
  for (const t of (db.tasks || [])) {
    if (affectedTaskModelIds.includes(t.taskModelId)) {
      affectedTaskIds.add(t.id);
      continue;
    }
    // inspect itemMappings if present
    if (t.itemMappings && Array.isArray(t.itemMappings)) {
      for (const im of t.itemMappings) {
        if (im.observationId && observationIds.has(im.observationId)) {
          affectedTaskIds.add(t.id);
          break;
        }
      }
    }
  }

  // Delete sessions that reference any of the affectedTaskIds
  if (affectedTaskIds.size > 0) {
    db.sessions = (db.sessions || []).filter((s) => !((s.taskIds || []).some((tid) => affectedTaskIds.has(tid))));
  }

  // Delete the tasks
  if (affectedTaskIds.size > 0) {
    db.tasks = (db.tasks || []).filter((t) => !affectedTaskIds.has(t.id));
  }

  // Finally remove the evidence model itself
  db.evidenceModels = (db.evidenceModels || []).filter((m) => m.id !== id);

  saveDB(db);
  res.json({ success: true, removedTasks: Array.from(affectedTaskIds) });
});

export default router;
