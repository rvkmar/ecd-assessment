// src/config/rolePermissions.js
// Role-based visibility and access control for ECD Assessment App

export const rolePermissions = {
  admin: {
    label: "System Admin",
    canView: [
      "questions",
      "competencyModels",
      "evidenceModels",
      "taskModels",
      "tasks",
      "sessions",
      "policies",
      "reports",
      "students",
      "teachers"
    ],
    canEdit: [
      "questions",
      "competencyModels",
      "evidenceModels",
      "taskModels",
      "tasks",
      "policies"
    ],
    canApprove: ["questions"], // promote from review → active
    canDelete: [
      "questions",
      "competencyModels",
      "evidenceModels",
      "taskModels",
      "tasks",
      "policies"
    ],
  },

  district: {
    label: "District User",
    canView: [
      "questions",
      "competencyModels",
      "evidenceModels",
      "taskModels",
      "tasks",
      "sessions",
      "reports"
    ],
    canEdit: [
      "tasks",              // can create local tasks
      "taskModels"          // can clone and modify published task models
    ],
    canApprove: ["questions"], // can promote questions from review to active
    canDelete: ["tasks"],      // local tasks only
    restrictions: {
      viewScope: "district",   // limits view to district data
      editableModels: "cloned", // can only edit cloned models
    },
  },

  teacher: {
    label: "Teacher",
    canView: [
      "competencyModels",
      "evidenceModels",
      "taskModels",
      "tasks",
      "sessions",
      "reports"
    ],
    canEdit: [
      "tasks",
      "sessions"
    ],
    canCreate: [
      "tasks",
      "sessions"
    ],
    canDelete: [],
    restrictions: {
      viewScope: "school",
      modelAccess: "read-only",
      questionAccess: "active-only",
    },
  },
};

// Helper to check if a role can perform an action
export function can(role, action, entity) {
  const r = rolePermissions[role];
  if (!r) return false;
  switch (action) {
    case "view": return r.canView?.includes(entity);
    case "edit": return r.canEdit?.includes(entity);
    case "delete": return r.canDelete?.includes(entity);
    case "approve": return r.canApprove?.includes(entity);
    case "create": return r.canCreate?.includes(entity);
    default: return false;
  }
}
