import Ajv from "ajv";

export const STORAGE_KEY = "ecd_mock_db_v2";

// Schema definition for validation
const ECD_SCHEMA = {
  type: "object",
  required: ["items", "evidenceModels", "tasks", "sessions"],
  properties: {
    items: { type: "array" },
    evidenceModels: { type: "array" },
    tasks: { type: "array" },
    sessions: { type: "array" }
  }
};

const ajv = new Ajv();
const validate = ajv.compile(ECD_SCHEMA);

export function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw
    ? JSON.parse(raw)
    : { items: [], evidenceModels: [], tasks: [], sessions: [] };
}

export function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

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

export function importDB(e, refresh, notify) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const db = JSON.parse(event.target.result);

      // ✅ Validate schema before saving
      if (!validate(db)) {
        console.error("Schema errors:", validate.errors);
        notify("❌ Import failed: JSON does not match schema.");
        return;
      }

      saveDB(db);
      refresh();
      notify("✅ Database imported successfully.");
    } catch (err) {
      console.error("Import error:", err);
      notify("❌ Invalid JSON file.");
    }
  };
  reader.readAsText(file);
}

export function clearDB(refresh, notify) {
  saveDB({ items: [], evidenceModels: [], tasks: [], sessions: [] });
  refresh();
  notify("All data cleared.");
}
