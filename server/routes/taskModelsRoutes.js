// server/routes/api/taskModelsRoutes.js
import express from "express";
import { loadDB, saveDB } from "../../src/utils/db-server.js";
import { validateEntity } from "../../src/utils/schema.js";

const router = express.Router();

// 🔹 Helper to validate expectedObservations
function validateExpectedObservations(taskModel, db) {
  const errors = [];

  // Collect valid observation/evidence IDs from linked evidenceModels
  let validObs = new Set();
  let validEvs = new Set();

  for (const emId of taskModel.evidenceModelIds || []) {
    const em = db.evidenceModels.find(m => m.id === emId);
    if (em) {
      for (const obs of em.observations || []) validObs.add(obs.id);
      for (const ev of em.evidences || []) validEvs.add(ev.id);
    }
  }

  // Validate each expectedObservation
  for (const eo of taskModel.expectedObservations || []) {
    if (!validObs.has(eo.observationId)) {
      errors.push(`Invalid observationId '${eo.observationId}' (not found in linked evidenceModels)`);
    }
    if (!validEvs.has(eo.evidenceId)) {
      errors.push(`Invalid evidenceId '${eo.evidenceId}' (not found in linked evidenceModels)`);
    }
  }

  return errors;
}

// 🔹 Helper to validate itemMappings
function validateItemMappings(taskModel) {
  const errors = [];
  const validPairs = new Set(
    (taskModel.expectedObservations || []).map(
      (eo) => `${eo.observationId}:${eo.evidenceId}`
    )
  );

  for (const mapping of taskModel.itemMappings || []) {
    const pairKey = `${mapping.observationId}:${mapping.evidenceId}`;
    if (!validPairs.has(pairKey)) {
      errors.push(
        `Invalid itemMapping: item '${mapping.itemId}' references observationId '${mapping.observationId}' and evidenceId '${mapping.evidenceId}', but that pair is not in expectedObservations`
      );
    }
  }

  return errors;
}

// ------------------------------
// GET /api/taskModels
// ------------------------------
router.get("/", (req, res) => {
  const db = loadDB();
  res.json(db.taskModels || []);
});

// ------------------------------
// GET /api/taskModels/:id
// ------------------------------
router.get("/:id", (req, res) => {
  const db = loadDB();
  const tm = db.taskModels?.find((m) => m.id === req.params.id);
  if (!tm) return res.status(404).json({ error: "TaskModel not found" });
  res.json(tm);
});

// ------------------------------
// DELETE /api/taskModels/:id
// ------------------------------
router.delete("/:id", (req, res) => {
  const db = loadDB();
  const idx = db.taskModels?.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "TaskModel not found" });

  const removed = db.taskModels.splice(idx, 1)[0];

  // cascade delete linked tasks
  if (db.tasks) {
    db.tasks = db.tasks.filter((t) => t.taskModelId !== req.params.id);
  }

  saveDB(db);
  res.json({ success: true, removed });
});


// ------------------------------
// POST /api/taskModels
// ------------------------------
router.post("/", (req, res) => {
  const db = loadDB();
  const { name, description, subTaskIds, evidenceModelIds, actions, difficulty, expectedObservations, itemMappings } = req.body;

  if (!name || !description) {
    return res.status(400).json({ error: "name and description are required" });
  }

  const newTaskModel = {
    id: `tm${Date.now()}`,
    name,
    description,
    subTaskIds: subTaskIds || [],
    evidenceModelIds: evidenceModelIds || [],
    actions: actions || [],
    difficulty: difficulty || "medium",
    expectedObservations: expectedObservations || [],
    itemMappings: itemMappings || [], // 🔹 new
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // ✅ Schema validation
  const { valid, errors } = validateEntity("taskModels", newTaskModel, db);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  // ✅ Cross-collection validation for expectedObservations
  const crossErrors = validateExpectedObservations(newTaskModel, db);
  if (crossErrors.length > 0) {
    return res.status(400).json({ error: "Invalid expectedObservations", details: crossErrors });
  }

  // ✅ Ensure itemMappings only reference valid expectedObservations
  const mappingErrors = validateItemMappings(newTaskModel);
  if (mappingErrors.length > 0) {
    return res.status(400).json({ error: "Invalid itemMappings", details: mappingErrors });
  }

  if (!db.taskModels) db.taskModels = [];
  db.taskModels.push(newTaskModel);
  saveDB(db);

  res.status(201).json(newTaskModel);
});

// ------------------------------
// PUT /api/taskModels/:id
// ------------------------------
router.put("/:id", (req, res) => {
  const db = loadDB();
  const idx = db.taskModels?.findIndex((m) => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "TaskModel not found" });

  const updates = req.body;
  const updatedTaskModel = {
    ...db.taskModels[idx],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  // ✅ Schema validation
  const { valid, errors } = validateEntity("taskModels", updatedTaskModel, db);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  // ✅ Cross-collection validation
  const crossErrors = validateExpectedObservations(updatedTaskModel, db);
  if (crossErrors.length > 0) {
    return res.status(400).json({ error: "Invalid expectedObservations", details: crossErrors });
  }

  // ✅ ItemMappings validation
  const mappingErrors = validateItemMappings(updatedTaskModel);
  if (mappingErrors.length > 0) {
    return res.status(400).json({ error: "Invalid itemMappings", details: mappingErrors });
  }

  db.taskModels[idx] = updatedTaskModel;
  saveDB(db);
  res.json(updatedTaskModel);
});

export default router;
