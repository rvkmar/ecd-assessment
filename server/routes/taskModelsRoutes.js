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

// 🔹 Helper to validate subTaskIds existence
function validateSubTasks(taskModel, db) {
  const errors = [];
  const allIds = new Set((db.taskModels || []).map((t) => t.id));
  for (const sid of taskModel.subTaskIds || []) {
    if (!allIds.has(sid)) {
      errors.push(`Invalid subTaskId '${sid}' (no matching taskModel found)`);
    }
    if (sid === taskModel.id) {
      errors.push(`Task model cannot reference itself as a sub-task (${sid})`);
    }
  }
  return errors;
}

// 🔹 Helper to detect circular sub-task references
function detectCircularSubTasks(taskModel, db) {
  const graph = new Map();

  // Build adjacency map
  for (const tm of db.taskModels || []) {
    graph.set(tm.id, new Set(tm.subTaskIds || []));
  }

  // Depth-first traversal to detect cycles
  const visited = new Set();
  const stack = new Set();

  function dfs(nodeId) {
    if (stack.has(nodeId)) return true; // cycle found
    if (visited.has(nodeId)) return false;

    visited.add(nodeId);
    stack.add(nodeId);

    const children = graph.get(nodeId) || [];
    for (const child of children) {
      if (dfs(child)) return true;
    }

    stack.delete(nodeId);
    return false;
  }

  // Run DFS starting from this task model
  const hasCycle = dfs(taskModel.id);
  return hasCycle
    ? [`Circular reference detected starting at '${taskModel.id}'`]
    : [];
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
  
  // 🔹 Expand sub-task details inline
  const expandSubTasks = (taskModel, db, depth = 0) => {
    if (!taskModel.subTaskIds || taskModel.subTaskIds.length === 0) return [];
    if (depth > 3) return []; // prevent runaway recursion

    return taskModel.subTaskIds.map((sid) => {
      const sub = db.taskModels.find((t) => t.id === sid);
      if (!sub) return { id: sid, missing: true };
      return {
        id: sub.id,
        name: sub.name,
        description: sub.description,
        difficulty: sub.difficulty,
        evidenceModelIds: sub.evidenceModelIds || [],
        expectedObservations: sub.expectedObservations || [],
        itemMappings: sub.itemMappings || [],
        subTasks: expandSubTasks(sub, db, depth + 1),
      };
    });
  };

  const expanded = {
    ...tm,
    expandedSubTasks: expandSubTasks(tm, db),
  };

  res.json(expanded);
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

  // ✅ Validate subTaskIds
  const subTaskErrors = validateSubTasks(newTaskModel, db);
  if (subTaskErrors.length > 0) {
    return res.status(400).json({ error: "Invalid subTaskIds", details: subTaskErrors });
  }

  // ✅ Detect circular reference
  const cycleErrors = detectCircularSubTasks(newTaskModel, db);
  if (cycleErrors.length > 0) {
    return res.status(400).json({ error: "Circular sub-task reference", details: cycleErrors });
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

  // ✅ Sub-Task validation
  const subTaskErrors = validateSubTasks(updatedTaskModel, db);
  if (subTaskErrors.length > 0) {
    return res.status(400).json({ error: "Invalid subTaskIds", details: subTaskErrors });
  }

  // ✅ Detect circular reference in updated structure
  const cycleErrors = detectCircularSubTasks(updatedTaskModel, db);
  if (cycleErrors.length > 0) {
    return res.status(400).json({ error: "Circular sub-task reference", details: cycleErrors });
  }
  
  db.taskModels[idx] = updatedTaskModel;
  saveDB(db);
  res.json(updatedTaskModel);
});

export default router;
