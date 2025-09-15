export const ECD_SCHEMA = {
  type: "object",
  required: ["items", "evidenceModels", "competencyModels", "tasks", "sessions"],
  properties: {
    items: { type: "array" },
    evidenceModels: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "name", "constructs", "observations", "scoringRule"],
        properties: {
          id: { type: "string" },
          name: { type: "string" },
          constructs: {
            type: "array",
            items: {
              type: "object",
              required: ["id", "text", "linkedCompetencyId"],
              properties: {
                id: { type: "string" },
                text: { type: "string" },
                linkedCompetencyId: { type: ["string", "null"] },
              },
            },
          },
          observations: { type: "array" },
          scoringRule: { type: "string" },
        },
      },
    },
    competencyModels: { type: "array" },
    tasks: { type: "array" },
    sessions: {
      type: "array",
      items: {
        type: "object",
        required: ["id", "taskId", "scores"],
        properties: {
          id: { type: "string" },
          taskId: { type: "string" },
          scores: { type: "array" },
        },
      },
    },
  },
};
