// useCompetencyStore.js
import { useState, useEffect } from "react";

const LS_KEYS = { MODELS: "ecd:competencyModels", COMPETENCIES: "ecd:competencies", LINKS: "ecd:links" };

export function nowISO() {
  return new Date().toISOString();
}

export function uid(prefix = "c") {
  // ✅ ensure competency model IDs use "cm" not "m"
  if (prefix === "m") prefix = "cm";
  return `${prefix}${Date.now()}${Math.floor(Math.random() * 900)
    .toString()
    .padStart(3, "0")}`;
}

async function fetchJSON(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return null;
  }
}

export function useCompetencyStore(notify) {
  const [models, setModels] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [links, setLinks] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasLoaded) {
      loadAll().then(() => {
        setHasLoaded(true);
        setLoading(false);
      });
    }
  }, [hasLoaded]);

  async function loadAll() {
    try {
      const [apiModels, apiComps, apiLinks] = await Promise.all([
        fetchJSON("/api/competencies/models"),
        fetchJSON("/api/competencies"),
        fetchJSON("/api/competency-links"),
      ]);
      if ((apiModels?.length || apiComps?.length)) {
        setModels(apiModels || []);
        setCompetencies(apiComps || []);
        setLinks(apiLinks || []);
        return;
      }
    } catch (err) {
      console.warn("[useCompetencyStore] API load failed, falling back to localStorage", err);
    }
    setModels(JSON.parse(localStorage.getItem(LS_KEYS.MODELS) || "[]"));
    setCompetencies(JSON.parse(localStorage.getItem(LS_KEYS.COMPETENCIES) || "[]"));
    setLinks(JSON.parse(localStorage.getItem(LS_KEYS.LINKS) || "[]"));
  }

  async function saveAll(newModels, newCompetencies, newLinks) {
    console.log("[useCompetencyStore] saveAll called", {
      newModels,
      newCompetencies,
      newLinks,
      stack: new Error().stack,
    });

    // ✅ Update React state
    setModels(newModels);
    setCompetencies(newCompetencies);
    setLinks(newLinks);

    // ✅ Save to LocalStorage (backup / offline mode)
    localStorage.setItem(LS_KEYS.MODELS, JSON.stringify(newModels));
    localStorage.setItem(LS_KEYS.COMPETENCIES, JSON.stringify(newCompetencies));
    localStorage.setItem(LS_KEYS.LINKS, JSON.stringify(newLinks));

    // ✅ Push to backend DB with safe IDs
    try {
      // Normalize models to use "cm" IDs
      const safeModels = newModels.map((m) => ({
        ...m,
        id: m.id?.startsWith("cm") ? m.id : `cm${m.id.replace(/^m/, "")}`,
      }));

      // Normalize competencies to reference safe "cm" IDs
      const safeCompetencies = newCompetencies.map((c) => ({
        ...c,
        modelId: c.modelId?.startsWith("cm") ? c.modelId : `cm${c.modelId.replace(/^m/, "")}`,
      }));

      await fetch("/api/competencies/models/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safeModels),
      });
      await fetch("/api/competencies/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(safeCompetencies),
      });
      await fetch("/api/competency-links/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newLinks),
      });

      console.log("[useCompetencyStore] ✅ Synced to backend with normalized IDs");
    } catch (err) {
      console.error("[useCompetencyStore] ❌ Failed to sync with backend", err);
      if (notify) notify("⚠️ Failed to sync with server. Local copy saved.");
    }
  }

  return { models, competencies, links, loadAll, saveAll, loading };
}
