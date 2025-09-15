// src/utils/db.js

const STORAGE_KEY = "ecd_mock_db_v2";

/** Load database from localStorage */
export function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  let db = raw ? JSON.parse(raw) : { items: [], evidenceModels: [], tasks: [], sessions: [], competencyModels: [] };

  // Migration: assign cmX to roots missing modelLabel
  let count = 1;
  db.competencyModels
    .filter((c) => !c.parentId)
    .forEach((c) => {
      if (!c.modelLabel) {
        c.modelLabel = `cm${count++}`;
      }
    });

  return db;
}

/** Save database to localStorage */
export function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

/** Clear everything */
export function clearDB() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Export DB as downloadable JSON */
export function exportDB() {
  const dataStr =
    "data:text/json;charset=utf-8," +
    encodeURIComponent(localStorage.getItem(STORAGE_KEY));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", "ecd-assessment.json");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

/** Import DB from uploaded JSON file */
export function importDB(event, refresh, notify) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      localStorage.setItem(STORAGE_KEY, e.target.result);
      refresh();
      notify("Imported successfully.");
    } catch (err) {
      notify("Failed to import DB.");
    }
  };
  reader.readAsText(file);
}

export function renumberRootCompetencies(db) {
  if (!db.competencyModels) db.competencyModels = [];

  // Get all root competencies (no parentId)
  const roots = db.competencyModels.filter((c) => !c.parentId);

  // Sort roots by creation order (using id timestamp if available)
  roots.sort((a, b) => {
    const ta = parseInt(a.id?.replace(/\D/g, ""), 10) || 0;
    const tb = parseInt(b.id?.replace(/\D/g, ""), 10) || 0;
    return ta - tb;
  });

  // Assign unique labels
  roots.forEach((root, idx) => {
    root.modelLabel = `cm${idx + 1}`;
    assignLevels(root.id, 1, db.competencyModels);
  });
}

function assignLevels(parentId, level, all) {
  const children = all.filter((c) => c.parentId === parentId);

  children.forEach((child) => {
    child.levelLabel = `Level ${level}`;
    assignLevels(child.id, level + 1, all);
  });
}

