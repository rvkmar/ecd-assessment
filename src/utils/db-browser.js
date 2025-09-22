// src/utils/db-browser.js
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "ecd_mock_db_v2";

// ------------------------------
// Load & Save DB
// ------------------------------

export function loadDB() {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  let db = raw
    ? JSON.parse(raw)
    : { items: [], evidenceModels: [], tasks: [], sessions: [], competencyModels: [], taskModels: [], students: [] };

  // ---- Migration logic ----
  let cmCount = 1;
  db.competencyModels.filter((c) => !c.parentId).forEach((c) => {
    if (!c.modelLabel) c.modelLabel = `cm${cmCount++}`;
  });

  if (db.competencyModels) {
    db.competencyModels = db.competencyModels.map((c) => {
      if (!c.parentIds) {
        return { ...c, parentIds: c.parentId ? [c.parentId] : [] };
      }
      return c;
    });
  }

  let emCount = 1;
  db.evidenceModels.forEach((e) => {
    if (!e.modelLabel) e.modelLabel = `em${emCount++}`;
    if (!e.rubrics) e.rubrics = [];
  });

  let tmCount = 1;
  db.tasks.forEach((t) => {
    if (!t.modelLabel) t.modelLabel = `tm${tmCount++}`;
  });

  return db;
}

export function saveDB(db) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function clearDB() {
  window.localStorage.removeItem(STORAGE_KEY);
}

// ------------------------------
// Generic CRUD helpers
// ------------------------------

export function getAll(collection) {
  const db = loadDB();
  return db[collection] || [];
}

export function getById(collection, id) {
  const db = loadDB();
  return (db[collection] || []).find((item) => item.id === id);
}

export function insert(collection, item) {
  const db = loadDB();
  db[collection] = db[collection] || [];
  const newItem = { id: uuidv4(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...item };
  db[collection].push(newItem);
  saveDB(db);
  return newItem;
}

export function update(collection, id, updates) {
  const db = loadDB();
  db[collection] = db[collection] || [];
  const index = db[collection].findIndex((item) => item.id === id);
  if (index !== -1) {
    db[collection][index] = { ...db[collection][index], ...updates, updatedAt: new Date().toISOString() };
    saveDB(db);
    return db[collection][index];
  }
  return null;
}

export function remove(collection, id) {
  const db = loadDB();
  db[collection] = db[collection] || [];
  db[collection] = db[collection].filter((item) => item.id !== id);
  saveDB(db);
}

// ------------------------------
// Session-specific helpers
// ------------------------------

export function createSession(studentId, tasks) {
  return insert("sessions", {
    studentId,
    tasks,
    currentTaskIndex: 0,
    responses: [],
    isCompleted: false,
    startedAt: new Date().toISOString(),
  });
}

export function updateSessionProgress(sessionId, currentTaskIndex) {
  return update("sessions", sessionId, {
    currentTaskIndex,
    updatedAt: new Date().toISOString(),
  });
}

export function addSessionResponse(sessionId, taskId, answer) {
  const session = getById("sessions", sessionId);
  if (!session) return null;

  const responses = session.responses || [];
  responses.push({
    taskId,
    answer,
    timestamp: new Date().toISOString(),
  });

  return update("sessions", sessionId, {
    responses,
    currentTaskIndex: (session.currentTaskIndex || 0) + 1,
  });
}

export function finishSession(sessionId) {
  return update("sessions", sessionId, {
    isCompleted: true,
    updatedAt: new Date().toISOString(),
  });
}

// ------------------------------
// Student helpers
// ------------------------------

export function createStudent(name) {
  return insert("students", { name });
}

export function getStudentById(studentId) {
  return getById("students", studentId);
}

export function getAllStudents() {
  return getAll("students");
}

// ------------------------------
// Migration utilities
// ------------------------------

export function renumberRootCompetencies(db) {
  if (!db.competencyModels) db.competencyModels = [];

  const roots = db.competencyModels.filter((c) => !c.parentIds?.length);
  roots.forEach((root, idx) => {
    root.modelLabel = `cm${idx + 1}`;
    assignLevels(root.id, 1, db.competencyModels);
  });
}

function assignLevels(parentId, level, all) {
  const children = all.filter((c) => c.parentIds?.includes(parentId));
  children.forEach((child) => {
    child.levelLabel = `Level ${level}`;
    assignLevels(child.id, level + 1, all);
  });
}

export function renumberRootEvidenceModels(db) {
  let counter = 1;
  db.evidenceModels.forEach((m) => {
    if (!m.modelLabel) {
      m.modelLabel = `em${counter}`;
      counter++;
    }
    if (!m.rubrics) m.rubrics = [];
  });
}

export function buildCompetencyOptions(nodes, parentId = null, level = 0) {
  const children = nodes.filter((n) => n.parentId === parentId);
  let options = [];
  children.forEach((c) => {
    const prefix = level === 0 ? `${c.modelLabel || "cm?"}:` : `Level ${level}:`;
    options.push({
      id: c.id,
      label: `${"— ".repeat(level)}${prefix} ${c.name}`,
    });
    options = options.concat(buildCompetencyOptions(nodes, c.id, level + 1));
  });
  return options;
}

export function renumberRootTasks(db) {
  if (!db.tasks) db.tasks = [];
  db.tasks.forEach((task, idx) => {
    task.modelLabel = `tm${idx + 1}`;
  });
}

// ------------------------------
// Import/Export helpers
// ------------------------------

export function exportDB() {
  const db = loadDB();
  return JSON.stringify(db, null, 2);
}

export function importDB(jsonString) {
  try {
    const db = JSON.parse(jsonString);
    saveDB(db);
    return true;
  } catch (e) {
    console.error("Failed to import DB:", e);
    return false;
  }
}
