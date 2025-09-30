// server/routes/policiesRoutes.js
import express from "express";
import { loadDB, saveDB } from "../../src/utils/db-server.js";
import { validateEntity } from "../../src/utils/schema.js";

const router = express.Router();

// ------------------------------
// GET /api/policies
// ------------------------------
router.get("/", (req, res) => {
  const db = loadDB();
  res.json(db.policies || []);
});

// ------------------------------
// POST /api/policies
// ------------------------------
// body: { name, description, type, config }
router.post("/", (req, res) => {
  const db = loadDB();
  const { name, description, type, config } = req.body;

  if (!name || !type) {
    return res.status(400).json({ error: "name and type are required" });
  }

  const newPolicy = {
    id: `p${Date.now()}`,
    name,
    description: description || "",
    type, // must match enum in schema.js: "fixed" | "IRT" | "BayesianNetwork"
    config: config || {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // ✅ Validate against schema
  const { valid, errors } = validateEntity("policies", newPolicy, db);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  db.policies = db.policies || [];
  db.policies.push(newPolicy);
  saveDB(db);

  res.status(201).json(newPolicy);
});

// ------------------------------
// PUT /api/policies/:id
// ------------------------------
router.put("/:id", (req, res) => {
  const db = loadDB();
  const idx = (db.policies || []).findIndex((p) => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: "Policy not found" });

  const updated = {
    ...db.policies[idx],
    ...req.body,
    updatedAt: new Date().toISOString(),
  };

  // ✅ Validate against schema
  const { valid, errors } = validateEntity("policies", updated, db);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  db.policies[idx] = updated;
  saveDB(db);
  res.json(updated);
});

// ------------------------------
// DELETE /api/policies/:id
// ------------------------------
router.delete("/:id", (req, res) => {
  const db = loadDB();
  const before = db.policies?.length || 0;
  db.policies = (db.policies || []).filter((p) => p.id !== req.params.id);

  if ((db.policies || []).length === before) {
    return res.status(404).json({ error: "Policy not found" });
  }

  saveDB(db);
  res.json({ success: true });
});

export default router;
