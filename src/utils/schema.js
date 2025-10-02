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

  // 🔹 Evidence Models (ECD-aligned)
  evidenceModels: {
    id: 'string',
    name: 'string',
    description: 'string',

    // Evidence Rules
    evidences: 'array',     // [{ id, description }]
    constructs: 'array',    // [{ id, competencyId, evidenceId }]
    observations: 'array',  // [{ 
    //    id, 
    //    type,                // "mcq" | "constructed" | "rubric" | "other"
    //    linkedQuestionIds,   // items/tasks that generate this observation
    //    rubric: {            // only if type = rubric
    //      levels: ['string'], // qualitative levels
    //    },
    //    scoring: {           // optional simple scoring rule for obs
    //      method: "binary" | "partial" | "rubric",
    //      weights: {}
    //    }
    // }]

    // Measurement Model (how observables → competencies)
    measurementModel: 'object', // {
    //   type: "IRT" | "BayesianNetwork" | "sum" | "average",
    //   weights: { obsId: weight },
    //   irtConfig: { model: "2PL"|"3PL" },
    //   bayesianConfig: { nodes: [], edges: [], CPTs: {} }
    // }

    createdAt: 'date',
    updatedAt: 'date',
  },

  // 🔹 Task Models (blueprints for assessment tasks)
  taskModels: {
    id: 'string',
    name: 'string',
    description: 'string',

    subTaskIds: 'array',           // nested blueprints if composite task
    evidenceModelIds: 'array',     // which evidence models this task contributes to

    // Actions describe what student does
    actions: 'array',              // e.g. attempt_question, simulation, discussion
    difficulty: 'string',          // easy | medium | hard

    // Link task to evidence rules explicitly
    expectedObservations: 'array', // [{ observationId, evidenceId }]

    itemMappings: 'array', // [{ itemId, observationId, evidenceId }]

    createdAt: 'date',
    updatedAt: 'date',
  },

  // 🔹 Task Instances (delivered in a session)
  tasks: {
    id: 'string',
    taskModelId: 'string',       // reference to blueprint
    questionId: 'string',        // optional: if instantiated from a question bank
    generatedEvidenceIds: 'array', // evidence actually captured during delivery
    generatedObservationIds: 'array', // which observations were triggered

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

  // 🔹 Student Sessions (runtime state with adaptive support)
  sessions: {
    id: 'string',
    studentId: 'string',

    taskIds: 'array',
    currentTaskIndex: 'number',

    // Rich response trace
    // 🔹 Inside sessions
    responses: 'array', // [
    //   {
    //     taskId: 'string',           // task attempted
    //     questionId: 'string',       // optional link to question bank
    //     rawAnswer: 'string',        // raw response from student
    //     observationId: 'string',    // which observation this maps to
    //     scoredValue: 'number|string', // result after applying scoring/rubric
    //     evidenceId: 'string',       // evidence supported/rejected
    //     rubricLevel: 'string',      // optional, if rubric applied
    //     timestamp: 'date'
    //   }
    // ]

    // Adaptive state
    studentModel: 'object',          // { irtTheta: number, bnPosteriors: {} }
    selectionStrategy: 'string',     // "fixed" | "IRT" | "BayesianNetwork" | "custom"
    nextTaskPolicy: 'object',        // config for adaptive task selection

    // Lifecycle
    isCompleted: 'boolean',
    startedAt: 'date',
    updatedAt: 'date',
  },

    policies: {
    type: "object",
    required: ["id", "name", "type", "createdAt", "updatedAt"],
    properties: {
      id: { type: "string", pattern: "^p[0-9]+$" },
      name: { type: "string", minLength: 1 },
      description: { type: "string" },
      type: {
        type: "string",
        enum: ["fixed", "IRT", "BayesianNetwork"], // extendable if needed
      },
      config: { type: "object" }, // e.g. { maxEntropy: true }
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
    },
    additionalProperties: false,
  },
};

// ------------------------------
// Validation function
// ------------------------------
export function validateEntity(collection, obj, db = null) {
  const rules = schema[collection];
  if (!rules) return { valid: false, errors: ["Unknown collection"] };
  const errors = [];

  // Helper: validate field against rule def
  function validateField(key, def, val) {
    if (val === undefined || val === null) return;

    switch (def.type) {
      case "string":
        if (typeof val !== "string") errors.push(`${key} should be string`);
        if (def.enum && !def.enum.includes(val)) {
          errors.push(`${key} must be one of: ${def.enum.join(", ")}`);
        }
        if (def.minLength && val.length < def.minLength) {
          errors.push(`${key} must be at least ${def.minLength} characters`);
        }
        if (def.format === "date-time") {
          const d = new Date(val);
          if (isNaN(d.getTime())) errors.push(`${key} should be a valid date-time`);
        }
        break;

      case "number":
        if (typeof val !== "number") errors.push(`${key} should be number`);
        break;

      case "boolean":
        if (typeof val !== "boolean") errors.push(`${key} should be boolean`);
        break;

      case "array":
        if (!Array.isArray(val)) errors.push(`${key} should be array`);
        break;

      case "object":
        if (typeof val !== "object" || Array.isArray(val)) {
          errors.push(`${key} should be object`);
        }
        break;
    }
  }

  // 🔹 Case 1: JSON-schema style
  if (rules.type === "object" && rules.properties) {
    for (const reqField of rules.required || []) {
      if (obj[reqField] === undefined || obj[reqField] === null) {
        errors.push(`Missing field: ${reqField}`);
      }
    }

    for (const [key, def] of Object.entries(rules.properties)) {
      validateField(key, def, obj[key]);
    }

    return { valid: errors.length === 0, errors };
  }

  // 🔹 Case 2: Flat-style rules
  for (const key of Object.keys(rules)) {
    const expected = rules[key];
    const val = obj[key];

    if (val === undefined || val === null) {
      if (["id", "type", "stem", "createdAt", "updatedAt"].includes(key)) {
        errors.push(`Missing field: ${key}`);
      }
      continue;
    }

    if (expected === "string" && typeof val !== "string") {
      errors.push(`${key} should be string`);
    }
    if (expected === "number" && typeof val !== "number") {
      errors.push(`${key} should be number`);
    }
    if (expected === "boolean" && typeof val !== "boolean") {
      errors.push(`${key} should be boolean`);
    }
    if (expected === "array" && !Array.isArray(val)) {
      errors.push(`${key} should be array`);
    }
    if (expected === "object" && (typeof val !== "object" || Array.isArray(val))) {
      errors.push(`${key} should be object`);
    }
    if (expected === "date") {
      const d = new Date(val);
      if (isNaN(d.getTime())) errors.push(`${key} should be date`);
    }
  }

  // 🔹 Existing conditional validations
  if (collection === "questions") {
    if (["constructed", "open"].includes(obj.type)) {
      if (!obj.metadata?.expectedAnswer || obj.metadata.expectedAnswer.trim() === "") {
        errors.push("expectedAnswer is required in metadata for constructed/open questions");
      }
    }

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

  if (collection === "evidenceModels") {
    const obsIds = new Set((obj.observations || []).map(o => o.id));
    const rubricMap = new Map();
      for (const obs of obj.observations || []) {
        if (obs.type === "rubric") {
          const hasLevels = Array.isArray(obs.rubric?.levels) && obs.rubric.levels.length > 0;
          const hasCriteria = Array.isArray(obs.rubric?.criteria) && obs.rubric.criteria.some(
            c => Array.isArray(c.levels) && c.levels.length > 0
          );

          if (!hasLevels && !hasCriteria) {
            errors.push(`Observation ${obs.id} is type rubric but missing rubric.levels or rubric.criteria`);
          } else if (hasLevels) {
            rubricMap.set(obs.id, obs.rubric.levels);
          } else if (hasCriteria) {
            // flatten criteria into levels for measurement model validation
            const flattened = [];
            for (const c of obs.rubric.criteria) {
              for (const l of c.levels || []) {
                if (l && l.name) flattened.push(l.name);
              }
            }
            rubricMap.set(obs.id, flattened);
          }
        }
      }
    const evidenceIds = new Set((obj.evidences || []).map(e => e.id));
    for (const c of obj.constructs || []) {
      if (!c.competencyId) {
        errors.push(`Construct ${c.id} is missing competencyId`);
      } else if (db && !db.competencies.find(comp => comp.id === c.competencyId)) {
        errors.push(`Construct ${c.id} references invalid competencyId: ${c.competencyId}`);
      }
      if (!c.evidenceId) {
        errors.push(`Construct ${c.id} is missing evidenceId`);
      } else if (!evidenceIds.has(c.evidenceId)) {
        errors.push(`Construct ${c.id} references invalid evidenceId: ${c.evidenceId}`);
      }
    }
    if (obj.measurementModel?.weights) {
      for (const wId of Object.keys(obj.measurementModel.weights)) {
        if (obsIds.has(wId)) continue;
        const [obsId, lvlIdxStr] = wId.split(":");
        const levels = rubricMap.get(obsId);
        const idx = parseInt(lvlIdxStr, 10);
        if (!(levels && !isNaN(idx) && idx >= 0 && idx < levels.length)) {
          errors.push(`Weight reference ${wId} is not a valid observationId or rubric-level key`);
        }
      }
    }
  }

  return { valid: errors.length === 0, errors };
}
// ------------------------------