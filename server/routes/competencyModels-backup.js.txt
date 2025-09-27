// routes/competencyModels.js (merged)
import express from "express";
import { validateEntity } from "../../src/utils/schema.js";

const router = express.Router();

// In-memory stores
let competencies = [];
let competencyModels = [];

/* -------------------------------
   COMPETENCY MODELS
-------------------------------- */
// GET all models
router.get("/models", (req, res) => {
  res.json(competencyModels);
});

// POST new model
router.post("/models", (req, res) => {
  const model = {
    id: `cm${Date.now()}`,
    name: req.body.name,
    description: req.body.description || "",
    subCompetencyIds: req.body.subCompetencyIds || [],
    crossLinkedCompetencyIds: req.body.crossLinkedCompetencyIds || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { valid, errors } = validateEntity("competencyModels", model);
  if (!valid) return res.status(400).json({ error: "Schema validation failed", details: errors });

  competencyModels.push(model);
  res.status(201).json(model);
});

// PUT update model
router.put("/models/:id", (req, res) => {
  const idx = competencyModels.findIndex(m => m.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Model not found" });

  const updated = {
    ...competencyModels[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  const { valid, errors } = validateEntity("competencyModels", updated);
  if (!valid) return res.status(400).json({ error: "Schema validation failed", details: errors });

  competencyModels[idx] = updated;
  res.json(updated);
});

// DELETE model + its competencies
router.delete("/models/:id", (req, res) => {
  const removedModelId = req.params.id;
  competencyModels = competencyModels.filter(m => m.id !== removedModelId);
  competencies = competencies.filter(c => c.modelId !== removedModelId);
  res.json({ removed: removedModelId });
});

// SYNC models
router.post("/models/sync", (req, res) => {
  competencyModels = (req.body || []).map(m => ({
    id: m.id,
    name: m.name,
    description: m.description || "",
    subCompetencyIds: m.subCompetencyIds || [],
    crossLinkedCompetencyIds: m.crossLinkedCompetencyIds || [],
    createdAt: m.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  res.json(competencyModels);
});

/* -------------------------------
   COMPETENCIES
-------------------------------- */
// GET all competencies
router.get("/", (req, res) => {
  res.json(competencies);
});

// POST new competency
router.post("/", (req, res) => {
  const comp = {
    id: `c${Date.now()}`,
    name: req.body.name,
    description: req.body.description || "",
    parentId: req.body.parentId || null,
    subCompetencyIds: [],
    crossLinkedCompetencyIds: [],
    modelId: req.body.modelId || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { valid, errors } = validateEntity("competencies", comp);
  if (!valid) return res.status(400).json({ error: "Schema validation failed", details: errors });

  competencies.push(comp);
  res.status(201).json(comp);
});

// PUT update competency
router.put("/:id", (req, res) => {
  const idx = competencies.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Not found" });

  const updated = {
    ...competencies[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  const { valid, errors } = validateEntity("competencies", updated);
  if (!valid) return res.status(400).json({ error: "Schema validation failed", details: errors });

  competencies[idx] = updated;
  res.json(updated);
});

// DELETE competency + descendants
router.delete("/:id", (req, res) => {
  const getDescendants = (cid) =>
    competencies.filter((c) => c.parentId === cid).flatMap((c) => [c.id, ...getDescendants(c.id)]);

  const idsToRemove = [req.params.id, ...getDescendants(req.params.id)];
  competencies = competencies.filter((c) => !idsToRemove.includes(c.id));

  res.json({ removed: idsToRemove });
});

// SYNC competencies
router.post("/sync", (req, res) => {
  competencies = (req.body || []).map(c => ({
    ...c,
    createdAt: c.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
  res.json(competencies);
});

export default router;
