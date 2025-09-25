// routes/links.js (update existing)
import express from "express";
import { validateEntity } from "../../src/utils/schema.js";
const router = express.Router();

let links = [];
let competencies = []; // in-memory copy, ideally shared with competencies.js

router.get("/", (req, res) => res.json(links));

router.post("/", (req, res) => {
  const { sourceId, destId } = req.body;
  if (!sourceId || !destId) return res.status(400).json({ error: "sourceId and destId required" });

  const link = { id: `l${Date.now()}`, sourceId, destId };
  links.push(link);

  // Mirror crossLinkedCompetencyIds
  const src = competencies.find(c => c.id === sourceId);
  if (src) {
    src.crossLinkedCompetencyIds = [...new Set([...(src.crossLinkedCompetencyIds || []), destId])];
    src.updatedAt = new Date().toISOString();
  }

  res.status(201).json(link);
});

router.delete("/:id", (req, res) => {
  const before = links.length;
  const link = links.find(l => l.id === req.params.id);
  links = links.filter(l => l.id !== req.params.id);
  if (before === links.length) return res.status(404).json({ error: "Link not found" });

  // Clean crossLinkedCompetencyIds
  if (link) {
    const src = competencies.find(c => c.id === link.sourceId);
    if (src) {
      src.crossLinkedCompetencyIds = (src.crossLinkedCompetencyIds || []).filter(id => id !== link.destId);
      src.updatedAt = new Date().toISOString();
    }
  }

  res.json({ removed: req.params.id });
});

router.post("/sync", (req, res) => {
  links = req.body || [];
  // Recompute crossLinkedCompetencyIds
  competencies.forEach(c => { c.crossLinkedCompetencyIds = []; });
  links.forEach(l => {
    const src = competencies.find(c => c.id === l.sourceId);
    if (src) src.crossLinkedCompetencyIds.push(l.destId);
  });
  res.json({ message: "Links synced", count: links.length });
});

export default router;
