import express from "express";
import bodyParser from "body-parser";
import sessionRoutes from "./routes/sessionRoutes.js";
import tasksRoutes from "./routes/tasksRoutes.js";
// import itemsEvidenceRoutes from "./routes/itemsEvidenceRoutes.js";
import questionsRoutes from "./routes/questionsRoutes.js";
import competencyRoutes from "./routes/competencies.js";
import linkRoutes from "./routes/links.js";

const app = express();
app.use(express.json());
app.use(bodyParser.json());

// ------------------------------
// API routes
// ------------------------------
app.use("/api/sessions", sessionRoutes);

// Add more API routes here (tasks, evidence models, etc.)
// app.use("/api", itemsEvidenceRoutes);
app.use("/api", questionsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/competencies", competencyRoutes);
app.use("/api/competency-links", linkRoutes);
// ------------------------------
// No static serving here!
// Nginx handles frontend build
// ------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ECD Assessment API running at http://localhost:${PORT}`);
});
