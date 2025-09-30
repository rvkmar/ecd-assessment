// server/routes/api/reportsRoutes.js
import express from "express";
import { loadDB } from "../../src/utils/db-server.js";

const router = express.Router();

// ------------------------------
// GET /api/reports/session/:id
// ------------------------------
router.get("/session/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const session = db.sessions.find(s => s.id === id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const student = db.students?.find(stu => stu.id === session.studentId);

  // 🔹 Lookup policy info
  const policies = db.policies || [];
  let policyDetails = null;

  if (session.nextTaskPolicy?.policyId) {
    policyDetails = policies.find(p => p.id === session.nextTaskPolicy.policyId);
  } else {
    // fallback: match by type (selectionStrategy)
    policyDetails = policies.find(p => p.type === session.selectionStrategy);
  }

  const report = {
    sessionId: id,
    student: student ? { id: student.id, name: student.name } : null,
    selectionStrategy: session.selectionStrategy,
    policy: policyDetails
      ? {
          id: policyDetails.id,
          name: policyDetails.name,
          description: policyDetails.description,
          type: policyDetails.type,
        }
      : null,
    responses: session.responses || [],
    captured: [], // new: evidence & observations from tasks
    constructs: [],
    recommendations: [],
  };

  // 🔹 Captured evidence/observations (from Task Instances)
  for (const tid of session.taskIds || []) {
    const task = db.tasks.find(t => t.id === tid);
    if (!task) continue;

    report.captured.push({
      taskId: task.id,
      taskModelId: task.taskModelId,
      generatedObservationIds: task.generatedObservationIds || [],
      generatedEvidenceIds: task.generatedEvidenceIds || [],
    });
  }

  // 🔹 Add measurement feedback (IRT / BN)
  if (session.selectionStrategy === "IRT" && session.studentModel?.irtTheta !== undefined) {
    const theta = session.studentModel.irtTheta;
    report.constructs.push({
      type: "IRT",
      estimate: theta,
      level: theta > 1 ? "Advanced" : theta > 0 ? "Proficient" : "Needs Support",
    });
    report.recommendations.push("Assign items near current theta for better precision.");
  }

  if (session.selectionStrategy === "BayesianNetwork" && session.studentModel?.bnPosteriors) {
    for (const [node, prob] of Object.entries(session.studentModel.bnPosteriors)) {
      report.constructs.push({
        type: "BayesianNetwork",
        node,
        probability: prob,
        level: prob > 0.7 ? "Strong" : prob > 0.4 ? "Developing" : "Needs Support",
      });
    }
    report.recommendations.push("Focus on nodes with highest uncertainty.");
  }

  if (report.recommendations.length === 0) {
    report.recommendations.push("Complete more tasks for a fuller assessment.");
  }

  res.json(report);
});



// ------------------------------
// GET /api/reports/session/:id/feedback
// ------------------------------
// router.get("/:id/feedback", (req, res) => {
//   const { id } = req.params;
//   const db = loadDB();
//   const session = db.sessions.find((s) => s.id === id);
//   if (!session) return res.status(404).json({ error: "Session not found" });

//   const feedback = {
//     sessionId: id,
//     strategy: session.selectionStrategy,
//     responses: session.responses.length,
//     constructs: [],
//     recommendations: [],
//     studentModel: session.studentModel || {},
//   };

//   // IRT feedback
//   if (session.selectionStrategy === "IRT" && session.studentModel?.irtTheta !== undefined) {
//     const theta = session.studentModel.irtTheta;
//     feedback.constructs.push({
//       type: "IRT",
//       estimate: theta,
//       level: theta > 1 ? "Advanced" : theta > 0 ? "Proficient" : "Needs Support",
//     });
//     feedback.recommendations.push("Assign items near current theta for better precision.");
//   }

//   // BN feedback
//   if (session.selectionStrategy === "BayesianNetwork" && session.studentModel?.bnPosteriors) {
//     for (const [node, prob] of Object.entries(session.studentModel.bnPosteriors)) {
//       feedback.constructs.push({
//         type: "BayesianNetwork",
//         node,
//         probability: prob,
//         level: prob > 0.7 ? "Strong" : prob > 0.4 ? "Developing" : "Needs Support",
//       });
//     }
//     feedback.recommendations.push("Focus on nodes with highest uncertainty.");
//   }

//   // Default / generic
//   if (feedback.recommendations.length === 0) {
//     feedback.recommendations.push("Complete more tasks for a fuller assessment.");
//   }

//   res.json(feedback);
// });

// ------------------------------
// GET /api/reports/session/:id/learner-feedback
// ------------------------------
router.get("/session/:id/learner-feedback", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const session = db.sessions.find(s => s.id === id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  // 🔹 Lookup policy info
  const policies = db.policies || [];
  let policyDetails = null;

  if (session.nextTaskPolicy?.policyId) {
    policyDetails = policies.find(p => p.id === session.nextTaskPolicy.policyId);
  } else {
    policyDetails = policies.find(p => p.type === session.selectionStrategy);
  }

  const feedback = {
    sessionId: id,
    policy: policyDetails
      ? {
          name: policyDetails.name,
          type: policyDetails.type,
          description: policyDetails.description,
        }
      : { type: session.selectionStrategy }, // fallback only
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
// GET /api/reports/session/:id/teacher-report
// ------------------------------
router.get("/session/:id/teacher-report", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  const session = db.sessions.find(s => s.id === id);
  if (!session) return res.status(404).json({ error: "Session not found" });

  const student = db.students?.find(stu => stu.id === session.studentId);

  // 🔹 Lookup policy info
  const policies = db.policies || [];
  let policyDetails = null;

  if (session.nextTaskPolicy?.policyId) {
    policyDetails = policies.find(p => p.id === session.nextTaskPolicy.policyId);
  } else {
    policyDetails = policies.find(p => p.type === session.selectionStrategy);
  }

  // 🔹 Pre-index collections
  const taskMap = Object.fromEntries((db.tasks || []).map((t) => [t.id, t]));
  const taskModelMap = Object.fromEntries((db.taskModels || []).map((tm) => [tm.id, tm]));
  const evidenceModelMap = {};
  for (const em of db.evidenceModels || []) {
    const obsMap = Object.fromEntries((em.observations || []).map((o) => [o.id, o]));
    const constructMap = Object.fromEntries((em.constructs || []).map((c) => [c.id, c]));
    evidenceModelMap[em.id] = { ...em, _obsMap: obsMap, _constructMap: constructMap };
  }

  const report = {
    sessionId: id,
    studentId: session.studentId,
    studentName: student ? student.name : null,

    // 🔹 Include policy info
    selectionStrategy: session.selectionStrategy,
    policy: policyDetails
      ? {
          id: policyDetails.id,
          name: policyDetails.name,
          description: policyDetails.description,
          type: policyDetails.type,
        }
      : null,

    modelSummary: {},
    responses: (session.responses || []).map((r) => {
      const task = taskMap[r.taskId];
      const tm = task ? taskModelMap[task.taskModelId] : null;

      let competencyId = null;
      let evidenceId = null;

      if (tm) {
        for (const emId of tm.evidenceModelIds || []) {
          const em = evidenceModelMap[emId];
          if (!em) continue;

          if (r.observationId) {
            const obs = em._obsMap[r.observationId];
            if (obs) {
              const construct = em._constructMap[obs.constructId];
              if (construct) {
                competencyId = construct.competencyId || competencyId;
                evidenceId = construct.evidenceId || evidenceId;
              }
            }
          }

          if (!competencyId && em.constructs.length > 0) {
            competencyId = em.constructs[0].competencyId || competencyId;
            evidenceId = em.constructs[0].evidenceId || evidenceId;
          }
        }
      }

      return {
        ...r,
        taskModelId: task?.taskModelId || null,
        competencyId,
        evidenceId,
      };
    }),
    recommendations: {
      groupLevel: [],
      individualLevel: []
    }
  };

  // 🔹 IRT summary
  if (session.selectionStrategy === "IRT" && session.studentModel?.irtTheta !== undefined) {
    const theta = session.studentModel.irtTheta;
    const stderr = session.responses.length > 0 ? (1 / Math.sqrt(session.responses.length)) : null;

    report.modelSummary.IRT = {
      theta,
      stderr,
      level: theta > 1 ? "Advanced" : theta > 0 ? "Proficient" : "Needs Support"
    };

    report.recommendations.individualLevel.push(
      "Assign items near current theta for higher measurement precision."
    );
  }

  // 🔹 BN summary
  if (session.selectionStrategy === "BayesianNetwork" && session.studentModel?.bnPosteriors) {
    report.modelSummary.BayesianNetwork = {};

    for (const [node, prob] of Object.entries(session.studentModel.bnPosteriors)) {
      const entropy = (p) => (p <= 0 || p >= 1)
        ? 0
        : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);

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
router.get("/teacher/class/:classId", (req, res) => {
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

  // 🔹 Pre-index collections
  const taskMap = Object.fromEntries((db.tasks || []).map((t) => [t.id, t]));
  const evidenceModelMap = {};
  for (const em of db.evidenceModels || []) {
    const obsMap = Object.fromEntries((em.observations || []).map((o) => [o.id, o]));
    const constructMap = Object.fromEntries((em.constructs || []).map((c) => [c.id, c]));
    evidenceModelMap[em.id] = { ...em, _obsMap: obsMap, _constructMap: constructMap };
  }

  // 🔹 Policy lookup map
  const policyMap = Object.fromEntries((db.policies || []).map((p) => [p.id, p]));

  const irtValues = [];
  const bnNodes = {};
  const capturedSummary = [];
  const policyUsage = [];

  for (const session of sessions) {
    // Track policy details
    let policyDetails = null;
    if (session.nextTaskPolicy?.policyId && policyMap[session.nextTaskPolicy.policyId]) {
      policyDetails = policyMap[session.nextTaskPolicy.policyId];
    } else {
      policyDetails = Object.values(policyMap).find(p => p.type === session.selectionStrategy);
    }
    if (policyDetails) {
      policyUsage.push({
        sessionId: session.id,
        policy: {
          id: policyDetails.id,
          name: policyDetails.name,
          description: policyDetails.description,
          type: policyDetails.type,
        }
      });
    }

    // collect IRT
    if (session.selectionStrategy === "IRT" && session.studentModel?.irtTheta !== undefined) {
      irtValues.push(session.studentModel.irtTheta);
    }

    // collect BN
    if (session.selectionStrategy === "BayesianNetwork" && session.studentModel?.bnPosteriors) {
      for (const [node, prob] of Object.entries(session.studentModel.bnPosteriors)) {
        if (!bnNodes[node]) bnNodes[node] = [];
        bnNodes[node].push(prob);
      }
    }

    // collect captured evidence
    for (const tid of session.taskIds || []) {
      const task = taskMap[tid];
      if (task) {
        capturedSummary.push({
          sessionId: session.id,
          studentId: session.studentId,
          taskId: task.id,
          generatedObservationIds: task.generatedObservationIds || [],
          generatedEvidenceIds: task.generatedEvidenceIds || [],
        });
      }
    }
  }

  // 🔹 Compute competency/evidence coverage
  const competencyCoverage = {};
  const evidenceCoverage = {};
  for (const cap of capturedSummary) {
    for (const obsId of cap.generatedObservationIds || []) {
      for (const em of Object.values(evidenceModelMap)) {
        const obs = em._obsMap[obsId];
        if (obs) {
          const construct = em._constructMap[obs.constructId];
          if (construct) {
            competencyCoverage[construct.competencyId] =
              (competencyCoverage[construct.competencyId] || 0) + 1;
            evidenceCoverage[construct.evidenceId] =
              (evidenceCoverage[construct.evidenceId] || 0) + 1;
          }
        }
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
    const entropy = (p) => (p <= 0 || p >= 1) ? 0 : -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
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
    policiesUsed: policyUsage, // 🔹 NEW
    summary: {
      IRT: irtSummary,
      BayesianNetwork: bnSummary,
      captured: capturedSummary,
      competencyCoverage,
      evidenceCoverage,
    },
    recommendations
  });
});


// ------------------------------
// GET /api/reports/teacher/district/:districtId
// ------------------------------
router.get("/teacher/district/:districtId", (req, res) => {
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

  // 🔹 Pre-index
  const taskMap = Object.fromEntries((db.tasks || []).map((t) => [t.id, t]));
  const evidenceModelMap = {};
  for (const em of db.evidenceModels || []) {
    const obsMap = Object.fromEntries((em.observations || []).map((o) => [o.id, o]));
    const constructMap = Object.fromEntries((em.constructs || []).map((c) => [c.id, c]));
    evidenceModelMap[em.id] = { ...em, _obsMap: obsMap, _constructMap: constructMap };
  }
  const policyMap = Object.fromEntries((db.policies || []).map((p) => [p.id, p]));

  const districtReport = {
    districtId,
    classes: {},
    policiesUsed: [], // 🔹 NEW
    districtSummary: {
      IRT: null,
      BayesianNetwork: {},
      captured: [],
    },
    recommendations: []
  };

  const allIrt = [];
  const bnNodes = {};
  const capturedSummary = [];
  const allPolicyUsage = [];

  // Process each class group
  for (const [classId, stuIds] of Object.entries(classGroups)) {
    const classSessions = db.sessions?.filter(s => stuIds.includes(s.studentId)) || [];

    const irtValues = [];
    const bnLocal = {};
    const classPolicyUsage = [];

    for (const session of classSessions) {
      // 🔹 Track policy
      let policyDetails = null;
      if (session.nextTaskPolicy?.policyId && policyMap[session.nextTaskPolicy.policyId]) {
        policyDetails = policyMap[session.nextTaskPolicy.policyId];
      } else {
        policyDetails = Object.values(policyMap).find(p => p.type === session.selectionStrategy);
      }
      if (policyDetails) {
        classPolicyUsage.push({
          sessionId: session.id,
          policy: {
            id: policyDetails.id,
            name: policyDetails.name,
            description: policyDetails.description,
            type: policyDetails.type,
          }
        });
        allPolicyUsage.push({
          classId,
          sessionId: session.id,
          policy: {
            id: policyDetails.id,
            name: policyDetails.name,
            description: policyDetails.description,
            type: policyDetails.type,
          }
        });
      }

      // collect IRT
      if (session.selectionStrategy === "IRT" && session.studentModel?.irtTheta !== undefined) {
        irtValues.push(session.studentModel.irtTheta);
        allIrt.push(session.studentModel.irtTheta);
      }

      // collect BN
      if (session.selectionStrategy === "BayesianNetwork" && session.studentModel?.bnPosteriors) {
        for (const [node, prob] of Object.entries(session.studentModel.bnPosteriors)) {
          if (!bnLocal[node]) bnLocal[node] = [];
          if (!bnNodes[node]) bnNodes[node] = [];
          bnLocal[node].push(prob);
          bnNodes[node].push(prob);
        }
      }

      // collect captured evidence
      for (const tid of session.taskIds || []) {
        const task = taskMap[tid];
        if (task) {
          capturedSummary.push({
            sessionId: session.id,
            studentId: session.studentId,
            classId,
            taskId: task.id,
            generatedObservationIds: task.generatedObservationIds || [],
            generatedEvidenceIds: task.generatedEvidenceIds || [],
          });
        }
      }
    }

    // summarize IRT for class
    let irtSummary = null;
    if (irtValues.length > 0) {
      const mean = irtValues.reduce((a, b) => a + b, 0) / irtValues.length;
      const variance = irtValues.reduce((a, b) => a + (b - mean) ** 2, 0) / irtValues.length;
      irtSummary = { count: irtValues.length, mean, stddev: Math.sqrt(variance) };
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

    districtReport.classes[classId] = {
      IRT: irtSummary,
      BayesianNetwork: bnSummary,
      policiesUsed: classPolicyUsage // 🔹 NEW
    };
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

  // attach captured + coverage
  districtReport.districtSummary.captured = capturedSummary;
  const competencyCoverage = {};
  const evidenceCoverage = {};
  for (const cap of capturedSummary) {
    for (const obsId of cap.generatedObservationIds || []) {
      for (const em of Object.values(evidenceModelMap)) {
        const obs = em._obsMap[obsId];
        if (obs) {
          const construct = em._constructMap[obs.constructId];
          if (construct) {
            competencyCoverage[construct.competencyId] =
              (competencyCoverage[construct.competencyId] || 0) + 1;
            evidenceCoverage[construct.evidenceId] =
              (evidenceCoverage[construct.evidenceId] || 0) + 1;
          }
        }
      }
    }
  }
  districtReport.districtSummary.competencyCoverage = competencyCoverage;
  districtReport.districtSummary.evidenceCoverage = evidenceCoverage;

  // 🔹 Attach policy usage
  districtReport.policiesUsed = allPolicyUsage;

  res.json(districtReport);
});


export default router;
