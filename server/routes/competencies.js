import express from "express";
const router = express.Router();

let competencies = [];

// Utility: assign modelLabel for root competencies
function assignModelLabels() {
  const roots = competencies.filter((c) => !c.parentId);
  roots.forEach((c, index) => {
    c.modelLabel = `cm${index + 1}`;
  });
}

// GET all competencies
router.get("/", (req, res) => {
  res.json(competencies);
});

// POST new competency
router.post("/", (req, res) => {
  const { name, description, parentId } = req.body;
  const newCompetency = {
    id: `c${Date.now()}`,
    name,
    description: description || "",
    parentId: parentId || null,
    modelLabel: parentId ? null : null, // temporary, fixed below
  };
  competencies.push(newCompetency);
  assignModelLabels();
  res.status(201).json(newCompetency);
});

// PUT update competency
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const { name, description, parentId } = req.body;

  let comp = competencies.find((c) => c.id === id);
  if (!comp) return res.status(404).json({ error: "Not found" });

  comp.name = name ?? comp.name;
  comp.description = description ?? comp.description;
  comp.parentId = parentId ?? comp.parentId;

  assignModelLabels();
  res.json(comp);
});

// DELETE competency + its descendants
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const getDescendants = (cid) =>
    competencies.filter((c) => c.parentId === cid).flatMap((c) => [c.id, ...getDescendants(c.id)]);

  const idsToRemove = [id, ...getDescendants(id)];
  competencies = competencies.filter((c) => !idsToRemove.includes(c.id));

  assignModelLabels();
  res.json({ removed: idsToRemove });
});

export default router;
