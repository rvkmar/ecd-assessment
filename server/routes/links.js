// routes/links.js
import express from "express";
const router = express.Router();

let links = [];

// GET all links
router.get("/", (req, res) => {
  res.json(links);
});

// POST new link
router.post("/", (req, res) => {
  const { sourceId, destId } = req.body;
  if (!sourceId || !destId) {
    return res.status(400).json({ error: "sourceId and destId required" });
  }

  const newLink = { id: `l${Date.now()}`, sourceId, destId };
  links.push(newLink);
  res.status(201).json(newLink);
});

// DELETE a link
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const before = links.length;
  links = links.filter((l) => l.id !== id);

  if (before === links.length) {
    return res.status(404).json({ error: "Link not found" });
  }

  res.json({ removed: id });
});

export default router;
