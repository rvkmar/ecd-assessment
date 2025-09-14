// src/utils/db.js

const STORAGE_KEY = "ecd_mock_db_v2";

/** Load database from localStorage */
export function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw
    ? JSON.parse(raw)
    : { items: [], evidenceModels: [], tasks: [], sessions: [] };
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
