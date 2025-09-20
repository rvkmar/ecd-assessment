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
          scoringRule: {
            type: "string",
            enum: ["Sum", "Average", "IRT", "BN"]
          },
          bnModel: {
            type: "object",
            properties: {
              nodes: {
                type: "array",
                items: {
                  type: "object",
                  required: ["id", "type"],
                  properties: {
                    id: { type: "string" },
                    type: { enum: ["latent", "evidence"] },
                    parents: {
                      type: "array",
                      items: { type: "string" }
                    },
                    prior: {
                      type: "object",
                      additionalProperties: { type: "number" }
                    },
                    cpt: {
                      type: "object",
                      additionalProperties: {
                        type: "object",
                        additionalProperties: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
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
