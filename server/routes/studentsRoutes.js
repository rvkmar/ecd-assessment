// server/routes/studentsRoutes.js
import express from "express";
import { loadDB, saveDB } from "../../src/utils/db-server.js";
import { validateEntity } from "../../src/utils/schema.js";

const router = express.Router();

// GET /api/students
router.get("/", (req, res) => {
  const db = loadDB();
  res.json(db.students || []);
});

// GET /api/students/:id
router.get("/:id", (req, res) => {
  const db = loadDB();
  const student = db.students.find((s) => s.id === req.params.id);
  if (!student) return res.status(404).json({ error: "Student not found" });
  res.json(student);
});

// POST /api/students
router.post("/", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Name required" });

  const db = loadDB();
  const newStudent = {
    id: `stu${Date.now()}`,
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const { valid, errors } = validateEntity("students", newStudent, db);
  if (!valid) return res.status(400).json({ error: "Schema validation failed", details: errors });

  if (!db.students) db.students = [];
  db.students.push(newStudent);
  saveDB(db);

  res.status(201).json(newStudent);
});

// DELETE /api/students/:id
router.delete("/:id", (req, res) => {
  const db = loadDB();
  const before = db.students.length;
  db.students = db.students.filter((s) => s.id !== req.params.id);
  if (db.students.length === before) {
    return res.status(404).json({ error: "Student not found" });
  }
  saveDB(db);
  res.json({ success: true });
});

export default router;
