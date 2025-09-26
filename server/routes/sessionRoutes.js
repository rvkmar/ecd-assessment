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

  const newSession = {
    id: `s${Date.now()}`,
    studentId: studentId || null,
    taskIds,
    currentTaskIndex: 0,
    responses: [],

    // Adaptive state
    studentModel: {},
    selectionStrategy: selectionStrategy || "fixed",
    nextTaskPolicy: nextTaskPolicy || {},

    // Lifecycle
    isCompleted: false,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

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

  // 🔹 Save response
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

  // 🔹 IRT theta update (if strategy = IRT)
  if (session.selectionStrategy === "IRT" && questionId) {
    const q = db.questions.find(qq => qq.id === questionId);
    if (q && typeof q.metadata?.b === "number") {
      const a = q.metadata?.a ?? 1.0;
      const b = q.metadata?.b;
      const c = q.metadata?.c ?? 0.0;

      const theta = session.studentModel?.irtTheta ?? 0;
      const y = scoredValue === 1 ? 1 : 0; // binary scoring for now

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
// POST /api/sessions/:id/finish
// ------------------------------
router.post("/:id/finish", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const session = db.sessions.find(s => s.id === id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  session.isCompleted = true;
  session.updatedAt = new Date().toISOString();
  saveDB(db);

  res.json(session);
});

// ------------------------------
// GET /api/sessions/:id/feedback
// ------------------------------
router.get("/:id/feedback", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const session = db.sessions.find((s) => s.id === id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const feedback = {
    sessionId: id,
    strategy: session.selectionStrategy,
    responses: session.responses.length,
    constructs: [],
    recommendations: [],
    studentModel: session.studentModel || {},
  };

  // IRT feedback
  if (session.selectionStrategy === "IRT" && session.studentModel?.irtTheta !== undefined) {
    const theta = session.studentModel.irtTheta;
    feedback.constructs.push({
      type: "IRT",
      estimate: theta,
      level: theta > 1 ? "Advanced" : theta > 0 ? "Proficient" : "Needs Support",
    });
    feedback.recommendations.push("Assign items near current theta for better precision.");
  }

  // BN feedback
  if (session.selectionStrategy === "BayesianNetwork" && session.studentModel?.bnPosteriors) {
    for (const [node, prob] of Object.entries(session.studentModel.bnPosteriors)) {
      feedback.constructs.push({
        type: "BayesianNetwork",
        node,
        probability: prob,
        level: prob > 0.7 ? "Strong" : prob > 0.4 ? "Developing" : "Needs Support",
      });
    }
    feedback.recommendations.push("Focus on nodes with highest uncertainty.");
  }

  // Default / generic
  if (feedback.recommendations.length === 0) {
    feedback.recommendations.push("Complete more tasks for a fuller assessment.");
  }

  res.json(feedback);
});

// ------------------------------
// GET /api/sessions/:id/learner-feedback
// ------------------------------
router.get("/:id/learner-feedback", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const session = db.sessions.find(s => s.id === id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const feedback = {
    sessionId: id,
    summary: {},
    strengths: [],
    focusAreas: [],
    nextSteps: [],
    encouragement: "Great effort! Keep practicing."
  };

  // IRT version
  if (session.selectionStrategy === "IRT" && session.studentModel?.irtTheta !== undefined) {
    const theta = session.studentModel.irtTheta;
    feedback.summary.level = theta > 1 ? "Advanced" : theta > 0 ? "Proficient" : "Needs Support";
    feedback.summary.message =
      theta > 1
        ? "Excellent! You’re ready for challenging problems."
        : theta > 0
        ? "Great work! You’re showing good understanding."
        : "Don’t worry, this is just a starting point.";

    if (theta <= 0) {
      feedback.focusAreas.push("Core skills practice");
      feedback.nextSteps.push("Review basic exercises with examples.");
    } else if (theta > 1) {
      feedback.strengths.push("Core skills mastered");
      feedback.nextSteps.push("Try advanced, multi-step problems.");
    }
  }

  // BN version
  if (session.selectionStrategy === "BayesianNetwork" && session.studentModel?.bnPosteriors) {
    for (const [node, prob] of Object.entries(session.studentModel.bnPosteriors)) {
      if (prob > 0.7) feedback.strengths.push(node);
      else if (prob < 0.4) feedback.focusAreas.push(node);
    }
    if (feedback.focusAreas.length > 0) {
      feedback.nextSteps.push(`Practice more in: ${feedback.focusAreas.join(", ")}`);
    }
  }

  res.json(feedback);
});


// ------------------------------
// GET /api/sessions/:id/teacher-report
// ------------------------------
router.get("/:id/teacher-report", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const session = db.sessions.find((s) => s.id === id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const student = db.students?.find(stu => stu.id === session.studentId);

  const report = {
    sessionId: id,
    studentId: session.studentId,
    studentName: student ? student.name : null,
    strategy: session.selectionStrategy,
    modelSummary: {},
    responses: session.responses || [],
    recommendations: {
      groupLevel: [],
      individualLevel: []
    }
  };

  // 🔹 IRT summary
  if (session.selectionStrategy === "IRT" && session.studentModel?.irtTheta !== undefined) {
    const theta = session.studentModel.irtTheta;
    // simple stderr placeholder: 1 / sqrt(N)
    const stderr = session.responses.length > 0 ? (1 / Math.sqrt(session.responses.length)) : null;

    report.modelSummary.IRT = {
      theta,
      stderr,
      level: theta > 1 ? "Advanced" : theta > 0 ? "Proficient" : "Needs Support"
    };

    report.recommendations.individualLevel.push("Assign items near current theta for higher measurement precision.");
  }

  // 🔹 BN summary
  if (session.selectionStrategy === "BayesianNetwork" && session.studentModel?.bnPosteriors) {
    report.modelSummary.BayesianNetwork = {};

    for (const [node, prob] of Object.entries(session.studentModel.bnPosteriors)) {
      // entropy helper
      const entropy = (p) => {
        if (p <= 0 || p >= 1) return 0;
        return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
      };

      report.modelSummary.BayesianNetwork[node] = {
        posterior: prob,
        entropy: entropy(prob),
        level: prob > 0.7 ? "Strong" : prob > 0.4 ? "Developing" : "Needs Support"
      };
    }

    report.recommendations.individualLevel.push("Focus on nodes with highest entropy (uncertainty).");
    report.recommendations.groupLevel.push("Review group-level trends to identify systemic weaknesses.");
  }

  // 🔹 Generic fallback
  if (Object.keys(report.modelSummary).length === 0) {
    report.recommendations.individualLevel.push("Complete more tasks to build a measurable profile.");
  }

  res.json(report);
});

// ------------------------------
// GET /api/reports/teacher/class/:classId
// ------------------------------
router.get("/reports/teacher/class/:classId", (req, res) => {
  const { classId } = req.params;
  const db = loadDB();

  // find students in class
  const students = db.students?.filter(stu => stu.classId === classId) || [];
  if (students.length === 0) {
    return res.status(404).json({ error: `No students found for classId ${classId}` });
  }

  // get all sessions for these students
  const sessions = db.sessions?.filter(s => students.some(stu => stu.id === s.studentId)) || [];
  if (sessions.length === 0) {
    return res.json({ classId, summary: {}, recommendations: [] });
  }

  const irtValues = [];
  const bnNodes = {};

  for (const session of sessions) {
    if (session.selectionStrategy === "IRT" && session.studentModel?.irtTheta !== undefined) {
      irtValues.push(session.studentModel.irtTheta);
    }

    if (session.selectionStrategy === "BayesianNetwork" && session.studentModel?.bnPosteriors) {
      for (const [node, prob] of Object.entries(session.studentModel.bnPosteriors)) {
        if (!bnNodes[node]) bnNodes[node] = [];
        bnNodes[node].push(prob);
      }
    }
  }

  // 🔹 Aggregate IRT
  let irtSummary = null;
  if (irtValues.length > 0) {
    const mean = irtValues.reduce((a, b) => a + b, 0) / irtValues.length;
    const variance = irtValues.reduce((a, b) => a + (b - mean) ** 2, 0) / irtValues.length;
    irtSummary = {
      count: irtValues.length,
      mean,
      stddev: Math.sqrt(variance),
      distribution: {
        below0: irtValues.filter(v => v < 0).length,
        between0and1: irtValues.filter(v => v >= 0 && v <= 1).length,
        above1: irtValues.filter(v => v > 1).length,
      }
    };
  }

  // 🔹 Aggregate BN
  const bnSummary = {};
  for (const [node, probs] of Object.entries(bnNodes)) {
    const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
    const entropy = (p) => {
      if (p <= 0 || p >= 1) return 0;
      return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
    };
    bnSummary[node] = {
      count: probs.length,
      mean,
      meanEntropy: probs.map(p => entropy(p)).reduce((a, b) => a + b, 0) / probs.length,
      level: mean > 0.7 ? "Strong" : mean > 0.4 ? "Developing" : "Needs Support"
    };
  }

  // 🔹 Recommendations
  const recommendations = [];
  if (irtSummary) {
    if (irtSummary.mean < 0) {
      recommendations.push("Class average ability is below expected level. Provide additional practice.");
    } else if (irtSummary.mean > 1) {
      recommendations.push("Class shows advanced proficiency. Introduce more challenging material.");
    } else {
      recommendations.push("Class is around average. Continue balanced practice.");
    }
  }
  for (const [node, summary] of Object.entries(bnSummary)) {
    if (summary.level === "Needs Support") {
      recommendations.push(`Focus on improving ${node} across the class.`);
    } else if (summary.meanEntropy > 0.8) {
      recommendations.push(`More data needed for ${node} — assign additional tasks.`);
    }
  }

  res.json({
    classId,
    students: students.map(s => ({ id: s.id, name: s.name })),
    summary: {
      IRT: irtSummary,
      BayesianNetwork: bnSummary,
    },
    recommendations
  });
});

// ------------------------------
// GET /api/reports/teacher/district/:districtId
// ------------------------------
router.get("/reports/teacher/district/:districtId", (req, res) => {
  const { districtId } = req.params;
  const db = loadDB();

  // Find all students in district
  const students = db.students?.filter(stu => stu.districtId === districtId) || [];
  if (students.length === 0) {
    return res.status(404).json({ error: `No students found for districtId ${districtId}` });
  }

  // Group students by class
  const classGroups = {};
  for (const stu of students) {
    if (!stu.classId) continue;
    if (!classGroups[stu.classId]) classGroups[stu.classId] = [];
    classGroups[stu.classId].push(stu.id);
  }

  const districtReport = {
    districtId,
    classes: {},
    districtSummary: {
      IRT: null,
      BayesianNetwork: {},
    },
    recommendations: []
  };

  const allIrt = [];
  const bnNodes = {};

  for (const [classId, stuIds] of Object.entries(classGroups)) {
    const classSessions = db.sessions?.filter(s => stuIds.includes(s.studentId)) || [];

    const irtValues = [];
    const bnLocal = {};

    for (const session of classSessions) {
      if (session.selectionStrategy === "IRT" && session.studentModel?.irtTheta !== undefined) {
        irtValues.push(session.studentModel.irtTheta);
        allIrt.push(session.studentModel.irtTheta);
      }

      if (session.selectionStrategy === "BayesianNetwork" && session.studentModel?.bnPosteriors) {
        for (const [node, prob] of Object.entries(session.studentModel.bnPosteriors)) {
          if (!bnLocal[node]) bnLocal[node] = [];
          if (!bnNodes[node]) bnNodes[node] = [];
          bnLocal[node].push(prob);
          bnNodes[node].push(prob);
        }
      }
    }

    // summarize IRT for class
    let irtSummary = null;
    if (irtValues.length > 0) {
      const mean = irtValues.reduce((a, b) => a + b, 0) / irtValues.length;
      const variance = irtValues.reduce((a, b) => a + (b - mean) ** 2, 0) / irtValues.length;
      irtSummary = {
        count: irtValues.length,
        mean,
        stddev: Math.sqrt(variance),
      };
    }

    // summarize BN for class
    const bnSummary = {};
    const entropy = (p) => (p <= 0 || p >= 1) ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
    for (const [node, probs] of Object.entries(bnLocal)) {
      const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
      bnSummary[node] = {
        count: probs.length,
        mean,
        meanEntropy: probs.map(p => entropy(p)).reduce((a, b) => a + b, 0) / probs.length,
      };
    }

    districtReport.classes[classId] = { IRT: irtSummary, BayesianNetwork: bnSummary };
  }

  // district-wide IRT
  if (allIrt.length > 0) {
    const mean = allIrt.reduce((a, b) => a + b, 0) / allIrt.length;
    const variance = allIrt.reduce((a, b) => a + (b - mean) ** 2, 0) / allIrt.length;
    districtReport.districtSummary.IRT = {
      count: allIrt.length,
      mean,
      stddev: Math.sqrt(variance),
    };

    if (mean < 0) {
      districtReport.recommendations.push("District average ability is below expected. Consider remedial programs.");
    } else if (mean > 1) {
      districtReport.recommendations.push("District shows advanced proficiency. Consider enrichment programs.");
    } else {
      districtReport.recommendations.push("District is around average. Balanced curriculum is appropriate.");
    }
  }

  // district-wide BN
  const entropy = (p) => (p <= 0 || p >= 1) ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
  for (const [node, probs] of Object.entries(bnNodes)) {
    const mean = probs.reduce((a, b) => a + b, 0) / probs.length;
    districtReport.districtSummary.BayesianNetwork[node] = {
      count: probs.length,
      mean,
      meanEntropy: probs.map(p => entropy(p)).reduce((a, b) => a + b, 0) / probs.length,
    };
    if (mean < 0.4) {
      districtReport.recommendations.push(`District needs support in ${node}.`);
    } else if (mean > 0.7) {
      districtReport.recommendations.push(`District shows strong performance in ${node}.`);
    }
  }

  res.json(districtReport);
});


export default router;
