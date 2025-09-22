// Schema definitions for ecd-assessment app
// Central place to define shape of entities used in db.js

export const schema = {
  tasks: {
    id: 'string',
    name: 'string',
    description: 'string',
    modelLabel: 'string', // tmX
    evidenceModelId: 'string',
    createdAt: 'date',
    updatedAt: 'date',
  },

  evidenceModels: {
    id: 'string',
    name: 'string',
    description: 'string',
    modelLabel: 'string', // emX
    rubrics: 'array',
    createdAt: 'date',
    updatedAt: 'date',
  },

  competencyModels: {
    id: 'string',
    name: 'string',
    description: 'string',
    modelLabel: 'string', // cmX
    parentIds: 'array',
    levelLabel: 'string',
    createdAt: 'date',
    updatedAt: 'date',
  },

  taskModels: {
    id: 'string',
    name: 'string',
    description: 'string',
    createdAt: 'date',
    updatedAt: 'date',
  },

  students: {
    id: 'string',
    name: 'string',
    createdAt: 'date',
    updatedAt: 'date',
  },

  sessions: {
    id: 'string',
    studentId: 'string',
    tasks: 'array', // array of taskIds
    currentTaskIndex: 'number',
    responses: 'array', // { taskId, answer, timestamp }
    isCompleted: 'boolean',
    startedAt: 'date',
    updatedAt: 'date',
  },
};

// Utility to validate an object against schema definition
export function validateEntity(collection, obj) {
  const rules = schema[collection];
  if (!rules) return { valid: false, errors: ['Unknown collection'] };
  const errors = [];

  for (const key of Object.keys(rules)) {
    if (obj[key] === undefined) {
      errors.push(`Missing field: ${key}`);
      continue;
    }
    const expected = rules[key];
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
    if (expected === 'date') {
      const d = new Date(obj[key]);
      if (isNaN(d.getTime())) errors.push(`${key} should be date`);
    }
  }

  return { valid: errors.length === 0, errors };
}
