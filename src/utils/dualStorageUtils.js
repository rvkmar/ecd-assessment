// dualStorageUtils.js
// Utility layer for syncing Competencies and Links with both localStorage and API

const COMP_KEY = "competencies";
const LINK_KEY = "competencyLinks";

// Helper to save to localStorage
function saveLocal(key, data) {
  localStorage.setItem(key, JSON.stringify(data));
}

// Helper to load from localStorage
function loadLocal(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : [];
}

// ---- Competencies ----

export async function getCompetencies() {
  let local = loadLocal(COMP_KEY);

  try {
    const res = await fetch("/api/competencies");
    if (res.ok) {
      const apiData = await res.json();
      saveLocal(COMP_KEY, apiData);
      return apiData;
    }
  } catch (err) {
    console.error("API fetch failed, using local", err);
  }

  return local;
}

export async function addCompetency(data) {
  let local = loadLocal(COMP_KEY);
  const newComp = { id: `c${Date.now()}`, ...data };
  local.push(newComp);
  saveLocal(COMP_KEY, local);

  try {
    const res = await fetch("/api/competencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const saved = await res.json();
      const updated = local.map((c) => (c.id === newComp.id ? saved : c));
      saveLocal(COMP_KEY, updated);
      return updated;
    }
  } catch (err) {
    console.error("API add failed, kept in local only", err);
  }

  return local;
}

export async function deleteCompetency(id) {
  let local = loadLocal(COMP_KEY).filter((c) => c.id !== id);
  saveLocal(COMP_KEY, local);

  try {
    await fetch(`/api/competencies/${id}`, { method: "DELETE" });
  } catch (err) {
    console.error("API delete failed, removed only locally", err);
  }

  return local;
}

// ---- Links ----

export async function getLinks() {
  let local = loadLocal(LINK_KEY);

  try {
    const res = await fetch("/api/competency-links");
    if (res.ok) {
      const apiData = await res.json();
      saveLocal(LINK_KEY, apiData);
      return apiData;
    }
  } catch (err) {
    console.error("API fetch failed, using local", err);
  }

  return local;
}

export async function addLink(data) {
  let local = loadLocal(LINK_KEY);
  const newLink = { id: `l${Date.now()}`, ...data };
  local.push(newLink);
  saveLocal(LINK_KEY, local);

  try {
    const res = await fetch("/api/competency-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      const saved = await res.json();
      const updated = local.map((l) => (l.id === newLink.id ? saved : l));
      saveLocal(LINK_KEY, updated);
      return updated;
    }
  } catch (err) {
    console.error("API add failed, kept in local only", err);
  }

  return local;
}

export async function deleteLink(id) {
  let local = loadLocal(LINK_KEY).filter((l) => l.id !== id);
  saveLocal(LINK_KEY, local);

  try {
    await fetch(`/api/competency-links/${id}`, { method: "DELETE" });
  } catch (err) {
    console.error("API delete failed, removed only locally", err);
  }

  return local;
}
