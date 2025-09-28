import express from "express";
import bodyParser from "body-parser";
import sessionRoutes from "./routes/sessionRoutes.js";
import questionsRoutes from "./routes/questionsRoutes.js";
import competencyRoutes from "./routes/competencyModels.js";
import linkRoutes from "./routes/links.js";
import evidenceRoutes from "./routes/evidenceModels.js";
import tasksRoutes from "./routes/tasksRoutes.js";
import taskModelsRoutes from "./routes/taskModelsRoutes.js";
import reportsRoutes from "./routes/reportsRoutes.js";
import studentsRoutes from "./routes/studentsRoutes.js";

const app = express();
app.use(express.json());
app.use(bodyParser.json());

// ------------------------------
// API routes
// ------------------------------
app.use("/api/sessions", sessionRoutes);

// Add more API routes here (tasks, evidence models, etc.)

app.use("/api/questions", questionsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/competencies", competencyRoutes);
app.use("/api/competency-links", linkRoutes);
app.use("/api/evidenceModels", evidenceRoutes);
app.use("/api/taskModels", taskModelsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/students", studentsRoutes);
// ------------------------------
// No static serving here!
// Nginx handles frontend build
// ------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ECD Assessment API running at http://localhost:${PORT}`);
});
