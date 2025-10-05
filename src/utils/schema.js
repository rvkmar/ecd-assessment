// schema.js
// Evidence-Centered Design schema with adaptive assessment support

export const schema = {
  // 🔹 Question Bank
  questions: {
    id: 'string',

    // Question Type & Core Content
    type: 'string',             // "mcq", "msq", "open", "numeric", "equation", "image", "audio", "video", "reading", "data", "rubric", "ordering", "matching"
    stem: 'string',             // prompt (supports Markdown + LaTeX)
    options: 'array',           // [{ id, text, image?, isCorrect? }]
    correctOptionIds: 'array',  // supports single or multiple answers

    // Media (optional)
    media: {
      image: 'string',          // image or diagram
      audio: 'string',          // listening/audio file
      video: 'string',          // video-based questions
      dataset: 'string',        // for data-handling (CSV/JSON)
    },

    // Reading comprehension linkage
    passageId: 'string',        // reference to shared passage
    subQuestionIds: 'array',    // linked sub-items (for comprehension sets)

    // Math / Equation
    equation: 'string',         // LaTeX string (optional)
    rubricId: 'string',         // rubric for open-response scoring

    // Workflow / Lifecycle
    status: 'string',           // "new" | "review" | "active" | "retired"

    // 🔹 Metadata (curriculum + cognitive)
    metadata: {
      subject: 'string',        // "Mathematics", "Science"
      grade: 'string',          // "Class 6", "Grade 8"
      topic: 'string',          // curriculum topic
      tags: 'array',            // ["fractions", "data", "visual"]
      difficulty: 'string',     // "easy" | "medium" | "hard"
      bloomLevel: 'string',     // "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create"
      soloLevel: 'string',      // "Prestructural" | "Unistructural" | "Multistructural" | "Relational" | "Extended Abstract"
      expectedAnswer: 'string', // expected text for open-response
      source: 'string',         // author or imported source
      interactionType: 'string',// "drag-drop", "hotspot", "table-analysis"
      dataSchema: 'object',     // structure of dataset/graph questions
    },

    // Optional ECD/psychometric mapping
    bnObservationId: 'string',  // Bayesian network node link
    irtParams: {
      a: 'number',              // discrimination
      b: 'number',              // difficulty
      c: 'number',              // guessing (optional)
    },

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
    constructs: 'array',    // [{ id, name, description, competencyId, evidenceId }]
    observations: 'array',  // [{
    // Observations structure
    // Each observation is evidence of student performance
    // {
    // id: string,
    // text: string,
    // type: "selected_response" | "open_response" | "rubric" | "numeric" | "performance" | "artifact" | "behavior" | "other",
    // constructId: string,
    // linkedTaskModelIds: "array",
    // rubric?: object,
    // scoring?: {
    // method: "binary" | "partial" | "rubric" | "numeric" | "likert" | "performance" | "custom",
    // weights?: {},
    // config?: {}, // for custom/performance rules
    // rules?: {} // for performance scoring
    // }
    // }


    // Notes:
    // - selected_response → linked to MCQ questions
    // - open_response → linked to constructed-response questions
    // - rubric → teacher-assessed rubric scoring
    // - numeric → direct numeric entry/measurement
    // - performance → logs, simulations, multi-step tasks
    // - artifact → uploaded file/project evidence
    // - behavior → observational/behavioral evidence
    // - other → fallback/experimental
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
    expectedObservations: 'array', // [{ observationId, evidenceId, taskModelId }]

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
    
    // ---- Scheduling (NEW)
    // Optional: availability window / deadline for this task instance.
    // If endTime is present and session is still in-progress when endTime passes,
    // the backend auto-finish logic may mark the containing session as submitted.
    startTime: 'date',    // when task is available
    endTime: 'date',      // deadline for auto-finish

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

    // Lifecycle (ENHANCED)
    // status: "in_progress" | "submitted" | "reviewed" | "reopened"
    // finishedAt: timestamp when student or system finished the session
    // autoFinished: true if system finished the session (deadline hit), false if student/teacher finished
    // reviewedAt: when teacher finalized review (if applicable)
    status: 'string',
    isCompleted: 'boolean', // legacy boolean retained for backward compatibility — kept in sync with status
    startedAt: 'date',
    finishedAt: 'date',
    autoFinished: 'boolean',
    reviewedAt: 'date',
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
        enum: ["fixed", "IRT", "BayesianNetwork", "MarkovChain"], // extendable if needed
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
    // 🔹 Required core fields
    if (!obj.type) errors.push("type is required");
    if (!obj.stem) errors.push("stem is required");

    // 🔹 Type-specific validations
    if (["mcq", "msq"].includes(obj.type)) {
      if (!obj.options || obj.options.length === 0) {
        errors.push("MCQ/MSQ questions must include at least one option");
      }
      if (!obj.correctOptionIds || obj.correctOptionIds.length === 0) {
        errors.push("MCQ/MSQ questions must include at least one correctOptionId");
      }
    }

    if (["open", "numeric"].includes(obj.type)) {
      if (!obj.metadata?.expectedAnswer || obj.metadata.expectedAnswer.trim() === "") {
        errors.push("Open/Numeric questions must include metadata.expectedAnswer");
      }
    }

    if (obj.type === "reading") {
      if (!obj.passageId) errors.push("Reading comprehension questions require passageId");
      if (!obj.subQuestionIds || obj.subQuestionIds.length === 0) {
        errors.push("Reading comprehension questions must reference subQuestionIds");
      }
    }

    if (obj.type === "image" && !obj.media?.image) {
      errors.push("Image-based questions must include media.image");
    }

    if (obj.type === "data" && !obj.media?.dataset) {
      errors.push("Data-handling questions must include media.dataset");
    }

    // 🔹 Lifecycle status validation
    if (obj.status && !["new", "review", "active", "retired"].includes(obj.status)) {
      errors.push("status must be one of: new, review, active, retired");
    }

    // 🔹 Metadata validation
    if (obj.metadata) {
      const m = obj.metadata;

      if (!m.subject) errors.push("metadata.subject is required");
      if (!m.grade) errors.push("metadata.grade is required");
      if (!m.topic) errors.push("metadata.topic is required");

      if (m.difficulty && !["easy", "medium", "hard"].includes(m.difficulty)) {
        errors.push("metadata.difficulty must be easy, medium, or hard");
      }

      if (m.bloomLevel && ![
        "Remember", "Understand", "Apply", "Analyze", "Evaluate", "Create"
      ].includes(m.bloomLevel)) {
        errors.push("metadata.bloomLevel must be a valid Bloom level");
      }

      if (m.soloLevel && ![
        "Prestructural", "Unistructural", "Multistructural", "Relational", "Extended Abstract"
      ].includes(m.soloLevel)) {
        errors.push("metadata.soloLevel must be a valid SOLO level");
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