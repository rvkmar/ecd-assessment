// schema.js
// Evidence-Centered Design schema with adaptive assessment support

export const schema = {
  // 🔹 Question Bank
  questions: {
    id: 'string',
    type: 'string',            // mcq, constructed, open, rubric
    stem: 'string',
    options: 'array',          // [{id, text}]
    correctOptionId: 'string',
    metadata: 'object',

    // Psychometric params (for IRT)
    // a: 'number',               // discrimination
    // b: 'number',               // difficulty
    // c: 'number',               // guessing (optional, 3PL)

    // For Bayesian Network mapping
    bnObservationId: 'string',

    createdAt: 'date',
    updatedAt: 'date',
  },

  // 🔹 Competency Models
  competencyModels: {
    id: 'string',
    name: 'string',
    description: 'string',
    subCompetencyIds: 'array',         // references other competencies
    crossLinkedCompetencyIds: 'array', // dependencies
    createdAt: 'date',
    updatedAt: 'date',
  },

  // 🔹 Evidence Models
  evidenceModels: {
    id: 'string',
    name: 'string',
    description: 'string',

    evidences: 'array',     // [{id, description}]
    constructs: 'array',    // [{id, competencyId, evidenceId}]
    observations: 'array',  // [{id, type, linkedQuestionIds}]
    rubrics: 'array',       // rubric definitions

    scoringModel: 'object', // {
                            //   type: "IRT" | "BayesianNetwork" | "sum" | "average",
                            //   weights: { obsId: weight },
                            //   irtConfig: { model: "2PL"|"3PL" },
                            //   bayesianConfig: { nodes: [], edges: [], CPTs: {} }
                            // }

    createdAt: 'date',
    updatedAt: 'date',
  },

  // 🔹 Task Models (blueprints)
  taskModels: {
    id: 'string',
    name: 'string',
    description: 'string',
    subTaskIds: 'array',
    evidenceModelIds: 'array',
    actions: 'array',       // attempt_question, simulation, discussion, etc.
    difficulty: 'string',   // easy | medium | hard
    createdAt: 'date',
    updatedAt: 'date',
  },

  // 🔹 Task Instances (delivered to session)
  tasks: {
    id: 'string',
    taskModelId: 'string',
    questionId: 'string',
    generatedEvidenceIds: 'array',
    createdAt: 'date',
    updatedAt: 'date',
  },

  // 🔹 Students
  students: {
    id: 'string',
    name: 'string',
    createdAt: 'date',
    updatedAt: 'date',
  },

  // 🔹 Student Sessions (runtime state)
  sessions: {
    id: 'string',
    studentId: 'string',
    taskIds: 'array',
    currentTaskIndex: 'number',
    responses: 'array', // { taskId, answer, timestamp }

    // Adaptive state
    irtTheta: 'number',     // evolving ability estimate
    bnPosteriors: 'object', // { nodeId: probability }

    isCompleted: 'boolean',
    startedAt: 'date',
    updatedAt: 'date',
  },
};

export function validateEntity(collection, obj) {
  const rules = schema[collection];
  if (!rules) return { valid: false, errors: ['Unknown collection'] };
  const errors = [];

  for (const key of Object.keys(rules)) {
    const expected = rules[key];

    // ✅ allow null for optional fields
    if (obj[key] === undefined || obj[key] === null) {
      if (["id", "type", "stem", "createdAt", "updatedAt"].includes(key)) {
        errors.push(`Missing field: ${key}`);
      }
      continue;
    }

    if (expected === 'string' && typeof obj[key] !== 'string') {
      errors.push(`${key} should be string`);
    }
    if (expected === 'number' && typeof obj[key] !== 'number') {
      errors.push(`${key} should be number`);
    }
    if (expected === 'boolean' && typeof obj[key] !== 'boolean') {
      errors.push(`${key} should be boolean`);
    }
    if (expected === 'array' && !Array.isArray(obj[key])) {
      errors.push(`${key} should be array`);
    }
    if (expected === 'object' && typeof obj[key] !== 'object') {
      errors.push(`${key} should be object`);
    }
    if (expected === 'date') {
      const d = new Date(obj[key]);
      if (isNaN(d.getTime())) errors.push(`${key} should be date`);
    }
  }

  // ✅ Conditional rules for questions
  if (collection === "questions") {
    // Constructed / Open → expectedAnswer required
    if (["constructed", "open"].includes(obj.type)) {
      if (!obj.metadata || !obj.metadata.expectedAnswer || obj.metadata.expectedAnswer.trim() === "") {
        errors.push("expectedAnswer is required in metadata for constructed/open questions");
      }
    }

    // MCQ → at least one option and valid correctOptionId
    if (obj.type === "mcq") {
      if (!obj.options || obj.options.length === 0) {
        errors.push("MCQ questions must have at least one option");
      }
      if (!obj.correctOptionId) {
        errors.push("MCQ questions must have a correctOptionId");
      } else if (!obj.options.some(o => o.id === obj.correctOptionId)) {
        errors.push("correctOptionId must match one of the option IDs");
      }
    }
  }

  // ✅ Conditional rules for evidenceModels
  if (collection === "evidenceModels") {
    const obsIds = new Set((obj.observations || []).map(o => o.id));
    const rubricMap = new Map((obj.rubrics || []).map(r => [r.id, r.levels || []]));
    const validObsIds = new Set(obsIds);
    const validRubricIds = new Set(rubricMap.keys());

    if (obj.scoringModel?.weights) {
      for (const wId of Object.keys(obj.scoringModel.weights)) {
        if (validObsIds.has(wId)) continue; // observation weight
        if (validRubricIds.has(wId)) continue; // rubric weight
        // rubric-level weight: r.id:levelIndex
        const [rubricId, lvlIdxStr] = wId.split(":");
        const levels = rubricMap.get(rubricId);
        const idx = parseInt(lvlIdxStr, 10);
        if (levels && !isNaN(idx) && idx >= 0 && idx < levels.length) continue;

        errors.push(`Weight reference ${wId} is not a valid observationId, rubricId, or rubric-level key`);
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
