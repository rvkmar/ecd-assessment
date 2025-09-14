export const STORAGE_KEY = "ecd_mock_db_v2";

export function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : { items: [], evidenceModels: [], tasks: [], sessions: [] };
}

export function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

export function exportDB() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(localStorage.getItem(STORAGE_KEY));
  const link = document.createElement("a");
  link.setAttribute("href", dataStr);
  link.setAttribute("download", "ecd-assessment.json");
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export function importDB(e, refresh, notify) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const db = JSON.parse(event.target.result);
      saveDB(db);
      refresh();
      notify("Database imported successfully.");
    } catch (err) {
      notify("Invalid JSON file");
    }
  };
  reader.readAsText(file);
}

export function clearDB(refresh, notify) {
  saveDB({ items: [], evidenceModels: [], tasks: [], sessions: [] });
  refresh();
  notify("All data cleared.");
}
