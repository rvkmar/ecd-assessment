// src/utils/db.js

const STORAGE_KEY = "ecd_mock_db_v2";

/** Load database from localStorage */
export function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  let db = raw ? JSON.parse(raw) : { items: [], evidenceModels: [], tasks: [], sessions: [], competencyModels: [] };

  // Migration: assign cmX to roots missing modelLabel
  let cmCount = 1;
  db.competencyModels
    .filter((c) => !c.parentId)
    .forEach((c) => {
      if (!c.modelLabel) {
        c.modelLabel = `cm${cmCount++}`;
      }
    });
    
  // 🔄 Migration: convert old `parentId` → `parentIds`
  if (db.competencyModels) {
    db.competencyModels = db.competencyModels.map((c) => {
      if (!c.parentIds) {
        return { ...c, parentIds: c.parentId ? [c.parentId] : [] };
      }
      return c;
    });
  }

  // Migration: assign emX to evidence model roots
  let emCount = 1;
  db.evidenceModels.forEach((e) => {
    if (!e.modelLabel) {
      e.modelLabel = `em${emCount++}`;
    }
    // ✅ Ensure rubrics array exists
    if (!e.rubrics) {
      e.rubrics = [];
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
      const parsed = JSON.parse(e.target.result);

      // ✅ Validate JSON schema before saving
      if (!parsed || typeof parsed !== "object" || !parsed.competencyModels) {
        throw new Error("Invalid schema");
      }

      localStorage.setItem(STORAGE_KEY, e.target.result);
      refresh();
      notify("Imported successfully.");
    } catch (err) {
      notify("Invalid JSON file — import aborted.");
    }
  };
  reader.readAsText(file);
}

/** Auto renumber competency roots and assign level labels */
export function renumberRootCompetencies(db) {
  if (!db.competencyModels) db.competencyModels = [];

  // Get all root competencies (no parentId)
  const roots = db.competencyModels.filter((c) => !c.parentIds?.length);

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
  const children = all.filter((c) => c.parentIds?.includes(parentId));

  children.forEach((child) => {
    child.levelLabel = `Level ${level}`;
    assignLevels(child.id, level + 1, all);
  });
}

export function renumberRootEvidenceModels(db) {
  let counter = 1;

  // Sort to keep numbering stable
  db.evidenceModels.forEach((m) => {
    if (!m.modelLabel) {
      m.modelLabel = `em${counter}`;
      counter++;
    } else {
      // Ensure counter moves past any existing labels
      const num = parseInt(m.modelLabel.replace("em", ""), 10);
      if (!isNaN(num) && num >= counter) {
        counter = num + 1;
      }
    }

    // ✅ Ensure rubrics array always present
    if (!m.rubrics) {
      m.rubrics = [];
    }
  });
}

/** 
 * Build hierarchical options for competencies
 * Example: 
 * cm1: Algebra
 *   Level 1: Linear Equations
 *   Level 2: Quadratic Equations
 */
export function buildCompetencyOptions(nodes, parentId = null, level = 0) {
  const children = nodes.filter((n) => n.parentId === parentId);
  let options = [];

  children.forEach((c) => {
    const prefix = level === 0 ? `${c.modelLabel || "cm?"}:` : `Level ${level}:`;
    options.push({
      id: c.id,
      label: `${"— ".repeat(level)}${prefix} ${c.name}`,
    });

    // recursively build children
    options = options.concat(buildCompetencyOptions(nodes, c.id, level + 1));
  });

  return options;
}
