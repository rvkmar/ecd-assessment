// useCompetencyStore.js (local-only mode with stack trace debug)
import { useState, useEffect } from "react";

const LS_KEYS = { MODELS: "ecd:competencyModels", COMPETENCIES: "ecd:competencies", LINKS: "ecd:links" };

export function nowISO() {
  return new Date().toISOString();
}

export function uid(prefix="c") {
  return `${prefix}${Date.now()}${Math.floor(Math.random()*900).toString().padStart(3,"0")}`;
}

async function fetchJSON(url, opts = {}) {
  try {
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch { return null; }
}

export function useCompetencyStore(notify) {
  const [models, setModels] = useState([]);
  const [competencies, setCompetencies] = useState([]);
  const [links, setLinks] = useState([]);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasLoaded) {
      console.log("[useCompetencyStore] Initial loadAll");
      loadAll().then(() => {
        setHasLoaded(true);
        setLoading(false);
      });
    }
  }, [hasLoaded]);

  async function loadAll() {
    try {
      console.log("[useCompetencyStore] Fetching from API");
      const [apiModels, apiComps, apiLinks] = await Promise.all([
        fetchJSON("/api/competencies/models"),
        fetchJSON("/api/competencies"),
        fetchJSON("/api/competency-links"),
      ]);
      if ((apiModels?.length || apiComps?.length)) {
        console.log("[useCompetencyStore] API data loaded", { apiModels, apiComps, apiLinks });
        setModels(apiModels || []);
        setCompetencies(apiComps || []);
        setLinks(apiLinks || []);
        return;
      }
    } catch (err) {
      console.warn("[useCompetencyStore] API load failed, falling back to localStorage", err);
    }
    console.log("[useCompetencyStore] Loading from localStorage");
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

    // ✅ Always keep local state authoritative
    setModels(newModels);
    setCompetencies(newCompetencies);
    setLinks(newLinks);

    // ✅ Immediately save to LocalStorage (auto-save)
    localStorage.setItem(LS_KEYS.MODELS, JSON.stringify(newModels));
    localStorage.setItem(LS_KEYS.COMPETENCIES, JSON.stringify(newCompetencies));
    localStorage.setItem(LS_KEYS.LINKS, JSON.stringify(newLinks));

    // 🔧 Disabled API sync temporarily to test flicker source
    console.log("[useCompetencyStore] Skipping API sync (local-only mode)");
  }

  return { models, competencies, links, loadAll, saveAll, loading };
}
