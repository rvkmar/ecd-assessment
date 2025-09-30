import express from "express";
import { loadDB, saveDB, finishSession } from "../../src/utils/db-server.js";
import { validateEntity } from "../../src/utils/schema.js";
import { log2 } from "mathjs"; // if not available, define inline

function entropy(p) {
  if (p <= 0 || p >= 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

const router = express.Router();

// ------------------------------
// POST /api/sessions
// ------------------------------
// body: { taskIds, studentId, selectionStrategy?, nextTaskPolicy? }
router.post("/", (req, res) => {
  const { taskIds, studentId, selectionStrategy, nextTaskPolicy } = req.body;
  const db = loadDB();

  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return res.status(400).json({ error: "taskIds must be a non-empty array" });
  }

  // Ensure tasks exist
  for (const tid of taskIds) {
    if (!db.tasks.find(t => t.id === tid)) {
      return res.status(400).json({ error: `Invalid taskId: ${tid}` });
    }
  }


  // ✅ Policy validation
  let strategy = selectionStrategy || "fixed";
  let policyConfig = nextTaskPolicy || {};

  // Check against /api/policies
  const availablePolicies = db.policies || [];
  const foundPolicy = availablePolicies.find((p) => p.type === strategy);

  if (!foundPolicy) {
    return res.status(400).json({
      error: `Invalid selectionStrategy: ${strategy}. No matching policy found in /api/policies`,
    });
  }

  // If caller passed explicit policyId in nextTaskPolicy, check it
  if (policyConfig.policyId) {
    const exists = availablePolicies.some((p) => p.id === policyConfig.policyId);
    if (!exists) {
      return res.status(400).json({
        error: `Invalid nextTaskPolicy.policyId: ${policyConfig.policyId}. Not found in /api/policies`,
      });
    }
  } else {
    // If no explicit policyId, default to matched strategy policy
    policyConfig = { policyId: foundPolicy.id, ...policyConfig };
  }

  const newSession = {
    id: `s${Date.now()}`,
    studentId: studentId || null,
    taskIds,
    currentTaskIndex: 0,
    responses: [],

    // Adaptive state
    studentModel: {},
    selectionStrategy: strategy,
    nextTaskPolicy: policyConfig,

    // Lifecycle
    status: "in-progress",
    isCompleted: false,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // ✅ Schema validation
  const { valid, errors } = validateEntity("sessions", newSession, db);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  if (!db.sessions) db.sessions = [];
  db.sessions.push(newSession);
  saveDB(db);

  res.status(201).json(newSession);
});


// ------------------------------
// GET /api/sessions
// ------------------------------
router.get("/", (req, res) => {
  const db = loadDB();
  res.json(db.sessions || []);
});

// ------------------------------
// GET /api/sessions/active
// ------------------------------
router.get("/active", (req, res) => {
  const db = loadDB();
  if (!db.sessions) db.sessions = [];
  const active = db.sessions.filter((s) => s.status !== "archived");
  res.json(active);
});

// ------------------------------
// GET /api/sessions/archived
// ------------------------------
router.get("/archived", (req, res) => {
  const db = loadDB();
  if (!db.sessions) db.sessions = [];
  const archived = db.sessions.filter((s) => s.status === "archived");
  res.json(archived);
});

// ------------------------------
// GET /api/sessions/:id
// ------------------------------
router.get("/:id", (req, res) => {
  const db = loadDB();
  const session = db.sessions.find(s => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json(session);
});

// ------------------------------
// POST /api/sessions/:id/submit
// ------------------------------
// body: { taskId, questionId?, rawAnswer, observationId?, scoredValue?, evidenceId?, rubricLevel? }
router.post("/:id/submit", (req, res) => {
  const { id } = req.params;
  const { taskId, questionId, rawAnswer, observationId, scoredValue, evidenceId, rubricLevel } = req.body;

  const db = loadDB();
  const session = db.sessions.find(s => s.id === id && !s.isCompleted);
  if (!session) return res.status(404).json({ error: "Session not found or already completed" });

  if (!session.taskIds.includes(taskId)) {
    return res.status(400).json({ error: `Task ${taskId} not part of this session` });
  }

  // 🔹 Validation: observationId & evidenceId
  const task = db.tasks.find(t => t.id === taskId);
  const taskModel = db.taskModels.find(tm => tm.id === task.taskModelId);

  let validObs = new Map();
  let validEvidenceIds = new Set();

  for (const emId of taskModel.evidenceModelIds || []) {
    const em = db.evidenceModels.find(m => m.id === emId);
    if (em) {
      for (const obs of em.observations || []) validObs.set(obs.id, obs);
      for (const ev of em.evidences || []) validEvidenceIds.add(ev.id);
    }
  }

  if (observationId && !validObs.has(observationId)) {
    return res.status(400).json({ error: `Invalid observationId: ${observationId}` });
  }
  if (evidenceId && !validEvidenceIds.has(evidenceId)) {
    return res.status(400).json({ error: `Invalid evidenceId: ${evidenceId}` });
  }
  if (rubricLevel && observationId) {
    const obs = validObs.get(observationId);
    if (!obs || !obs.rubric || !obs.rubric.levels.includes(rubricLevel)) {
      return res.status(400).json({ error: `Invalid rubricLevel ${rubricLevel} for observation ${observationId}` });
    }
  }

  // 🔹 Save response in session
  const response = {
    taskId,
    questionId: questionId || null,
    rawAnswer: rawAnswer || null,
    observationId: observationId || null,
    scoredValue: scoredValue !== undefined ? scoredValue : null,
    evidenceId: evidenceId || null,
    rubricLevel: rubricLevel || null,
    timestamp: new Date().toISOString(),
  };

  session.responses.push(response);
  session.currentTaskIndex = Math.min(session.currentTaskIndex + 1, session.taskIds.length);
  session.updatedAt = new Date().toISOString();

  // 🔹 Update Task Instance: record generated evidence/observations
  if (observationId && !task.generatedObservationIds.includes(observationId)) {
    task.generatedObservationIds.push(observationId);
  }
  if (evidenceId && !task.generatedEvidenceIds.includes(evidenceId)) {
    task.generatedEvidenceIds.push(evidenceId);
  }
  task.updatedAt = new Date().toISOString();

  // 🔹 IRT theta update (if strategy = IRT) ... (unchanged)
  if (session.selectionStrategy === "IRT" && questionId) {
    const q = db.questions.find(qq => qq.id === questionId);
    if (q && typeof q.metadata?.b === "number") {
      const a = q.metadata?.a ?? 1.0;
      const b = q.metadata?.b;
      const c = q.metadata?.c ?? 0.0;

      const theta = session.studentModel?.irtTheta ?? 0;
      const y = scoredValue === 1 ? 1 : 0; // binary scoring for now

      // 3PL model probability of correct response  
      // P(θ) = c + (1-c)/(1 + exp(-a(θ-b)))
      const p = c + (1 - c) / (1 + Math.exp(-a * (theta - b)));

      // gradient of log-likelihood wrt θ
      const grad = a * (y - p) * (1 - c);

      // simple update
      const lr = 0.1;
      const newTheta = theta + lr * grad;

      if (!session.studentModel) session.studentModel = {};
      session.studentModel.irtTheta = newTheta;
    }
  }

  const { valid, errors } = validateEntity("sessions", session, db);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  saveDB(db);
  res.json(session);
});

// ------------------------------
// GET /api/sessions/:id/next-task
// ------------------------------
router.get("/:id/next-task", (req, res) => {
  const db = loadDB();
  const session = db.sessions.find(s => s.id === req.params.id && !s.isCompleted);
  if (!session) return res.json({});

  // Sequential strategy
  if (session.selectionStrategy === "fixed") {
    if (session.currentTaskIndex < session.taskIds.length) {
      return res.json({
        taskId: session.taskIds[session.currentTaskIndex],
        strategy: "fixed",
        debug: { index: session.currentTaskIndex }
      });
    }
    return res.json({});
  }

  // IRT strategy
  if (session.selectionStrategy === "IRT") {
    const theta = session.studentModel?.irtTheta ?? 0;
    let bestTask = null;
    let bestDiff = Infinity;
    let debugInfo = {};

    for (const tid of session.taskIds) {
      if (session.responses.some(r => r.taskId === tid)) continue;
      const task = db.tasks.find(t => t.id === tid);
      if (!task) continue;

      const q = db.questions.find(qq => qq.id === task.questionId);
      if (!q) continue;

      const b = q.metadata?.b;
      if (typeof b !== "number") continue;

      const diff = Math.abs(b - theta);
      if (diff < bestDiff) {
        bestDiff = diff;
        bestTask = task;
        debugInfo = { theta, b, diff };
      }
    }

    return bestTask
      ? res.json({ taskId: bestTask.id, strategy: "IRT", debug: debugInfo })
      : res.json({});
  }

  // Bayesian Network strategy
  if (session.selectionStrategy === "BayesianNetwork") {
    let bestTask = null;
    let bestGain = -Infinity;
    let debugInfo = {};

    for (const tid of session.taskIds) {
      if (session.responses.some(r => r.taskId === tid)) continue;
      const task = db.tasks.find(t => t.id === tid);
      if (!task) continue;

      const taskModel = db.taskModels.find(tm => tm.id === task.taskModelId);
      if (!taskModel) continue;

      let gain = 0;
      let obsDebug = [];

      for (const emId of taskModel.evidenceModelIds || []) {
        const em = db.evidenceModels.find(m => m.id === emId);
        if (!em || em.measurementModel?.type !== "BayesianNetwork") continue;

        const CPTs = em.measurementModel.bayesianConfig?.CPTs || {};
        for (const eo of taskModel.expectedObservations || []) {
          const obs = em.observations.find(o => o.id === eo.observationId);
          if (!obs) continue;

          const nodeId = obs.id;
          const prior = session.studentModel?.bnPosteriors?.[nodeId] ?? 0.5;
          const nodeCPT = CPTs[nodeId];
          if (!nodeCPT) continue;

          // Prior entropy
          const Hprior = entropy(prior);

          // CPT: { "true": P(obs=1|node=1), "false": P(obs=1|node=0) }
          const pObsGivenNode1 = nodeCPT["true"] ?? 0.8;
          const pObsGivenNode0 = nodeCPT["false"] ?? 0.2;

          // Expected posterior after obs=1 and obs=0
          const likelihood1 = pObsGivenNode1;
          const likelihood0 = pObsGivenNode0;

          // normalize
          const norm = likelihood1 * prior + likelihood0 * (1 - prior);
          const post1 = norm > 0 ? (likelihood1 * prior) / norm : prior;

          const norm2 = (1 - pObsGivenNode1) * prior + (1 - pObsGivenNode0) * (1 - prior);
          const post0 = norm2 > 0 ? ((1 - pObsGivenNode1) * prior) / norm2 : prior;

          // Expected entropy
          const Hexp = 0.5 * entropy(post1) + 0.5 * entropy(post0);
          const infoGain = Hprior - Hexp;

          // Info gain
          gain += Hprior - Hexp;
          obsDebug.push({ nodeId, prior, Hprior, post1, post0, Hexp, infoGain });
        }
      }

      if (gain > bestGain) {
        bestGain = gain;
        bestTask = task;
        debugInfo = { totalGain: gain, observations: obsDebug };
      }
    }

    return bestTask
      ? res.json({ taskId: bestTask.id, strategy: "BayesianNetwork", debug: debugInfo })
      : res.json({});
  }

  return res.json({});
});

// ------------------------------
// POST /api/sessions/:id/pause
// ------------------------------
router.post("/:id/pause", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  if (!db.sessions) db.sessions = [];
  const idx = db.sessions.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: "Session not found" });

  db.sessions[idx].status = "paused";
  db.sessions[idx].updatedAt = new Date().toISOString();
  saveDB(db);
  res.json(db.sessions[idx]);
});

// ------------------------------
// POST /api/sessions/:id/resume
// ------------------------------
router.post("/:id/resume", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  if (!db.sessions) db.sessions = [];
  const idx = db.sessions.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: "Session not found" });

  if (db.sessions[idx].status !== "paused") {
    return res.status(400).json({ error: "Session is not paused" });
  }

  db.sessions[idx].status = "in-progress";
  db.sessions[idx].updatedAt = new Date().toISOString();
  saveDB(db);
  res.json(db.sessions[idx]);
});


// ------------------------------
// POST /api/sessions/:id/finish
// ------------------------------
router.post("/:id/finish", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  if (!db.sessions) db.sessions = [];
  const idx = db.sessions.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: "Session not found" });

  db.sessions[idx].status = "completed";   // ✅ mark completed
  db.sessions[idx].isCompleted = true;     // keep legacy flag if used
  db.sessions[idx].updatedAt = new Date().toISOString();

  saveDB(db);
  res.json(db.sessions[idx]);
});

// ------------------------------
// POST /api/sessions/:id/archive
// ------------------------------
router.post("/:id/archive", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  if (!db.sessions) db.sessions = [];
  const idx = db.sessions.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: "Session not found" });

  db.sessions[idx].status = "archived";
  db.sessions[idx].updatedAt = new Date().toISOString();
  saveDB(db);
  res.json(db.sessions[idx]);
});

// ------------------------------
// DELETE /api/sessions/:id
// ------------------------------
// For admin use only
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  if (!db.sessions) db.sessions = [];
  const idx = db.sessions.findIndex((s) => s.id === id);
  if (idx === -1) return res.status(404).json({ error: "Session not found" });

  const deleted = db.sessions.splice(idx, 1)[0];
  saveDB(db);
  res.json({ success: true, deleted });
});

export default router;
