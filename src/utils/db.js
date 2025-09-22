// src/utils/db.js

// Dispatcher: chooses browser or server implementation
let impl;

// if (typeof window !== "undefined" && typeof window.localStorage !== "undefined" && process.env.NODE_ENV !== "production") {
//   // Browser mode
//   impl = require("./db-browser.js");
// } else {
//   // Server mode (production or Node.js)
//   impl = require("./db-server.js");
// }

if (typeof window === "undefined") {
  impl = await import("./db-server.js");
} else {
  impl = await import("./db-browser.js");
}

export const {
  loadDB,
  saveDB,
  clearDB,
  getAll,
  getById,
  insert,
  update,
  remove,
  createSession,
  updateSessionProgress,
  addSessionResponse,
  finishSession,
  createStudent,
  getStudentById,
  getAllStudents,
  renumberRootCompetencies,
  renumberRootEvidenceModels,
  buildCompetencyOptions,
  renumberRootTasks,
  exportDB,
  importDB,
} = impl;
