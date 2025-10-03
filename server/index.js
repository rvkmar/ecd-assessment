import express from "express";
import bodyParser from "body-parser";
import cors from "cors"; // 
import fs from "fs";     // 
import path from "path"; // 
import bcrypt from "bcrypt"; // 
import jwt from "jsonwebtoken"; // 
import { fileURLToPath } from "url";
import rateLimit from "express-rate-limit";

import sessionRoutes from "./routes/sessionRoutes.js";
import questionsRoutes from "./routes/questionsRoutes.js";
import competencyRoutes from "./routes/competencyModels.js";
import linkRoutes from "./routes/links.js";
import evidenceRoutes from "./routes/evidenceModels.js";
import tasksRoutes from "./routes/tasksRoutes.js";
import taskModelsRoutes from "./routes/taskModelsRoutes.js";
import reportsRoutes from "./routes/reportsRoutes.js";
import studentsRoutes from "./routes/studentsRoutes.js";
import policiesRoutes from "./routes/policiesRoutes.js";
import calibrationRoutes from "./routes/calibrationRoutes.js";

const app = express();
app.use(express.json());
app.use(bodyParser.json());

// Enable CORS for development only
if (process.env.NODE_ENV !== "production") {
  app.use(cors({ origin: "http://localhost:5173", credentials: true }));
}

// Limit login attempts: 5 per minute per IP
const loginLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5,
  message: { error: "Too many login attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});


// ------------------------------
// LOGIN route (new)
// ------------------------------
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, "users.json");
let users = [];
try {
  users = JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  console.log(`✅ Loaded ${users.length} users from users.json`);
} catch (err) {
  console.error("⚠️ Could not read users.json", err);
  users = [];
}

const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

app.post("/api/login", loginLimiter, async (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) {
    return res
      .status(400)
      .json({ error: "username, password and role are required" });
  }

  const user = users.find((u) => u.username === username && u.role === role);

  let isMatch = false;
  if (user) {
    try {
      if (user.password.startsWith("$2")) {
        isMatch = await bcrypt.compare(password, user.password);
      } else {
        isMatch = user.password === password;
      }
    } catch {
      isMatch = false;
    }
  }

  // ✅ unified error for wrong user/role/password
  if (!user || !isMatch) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = jwt.sign({ username, role }, JWT_SECRET, { expiresIn: "1h" });
  return res.json({ token, username, role });
});



// Role-specific mock endpoints
app.get("/api/admin/data", (req, res) => {
  res.json({ message: "Admin-only data", timestamp: new Date() });
});

app.get("/api/district/data", (req, res) => {
  res.json({ message: "District-only data", timestamp: new Date() });
});

app.get("/api/teacher/data", (req, res) => {
  res.json({ message: "Teacher-only data", timestamp: new Date() });
});

app.get("/api/student/data", (req, res) => {
  res.json({ message: "Student-only data", timestamp: new Date() });
});

// ------------------------------
// Existing API routes (unchanged)
// ------------------------------
app.use("/api/sessions", sessionRoutes);
app.use("/api/questions", questionsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/competencies", competencyRoutes);
app.use("/api/competency-links", linkRoutes);
app.use("/api/evidenceModels", evidenceRoutes);
app.use("/api/taskModels", taskModelsRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/policies", policiesRoutes);
app.use("/api/calibrate", calibrationRoutes);

// ------------------------------
// No static serving here! Nginx handles frontend build
// ------------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ ECD Assessment API running at http://localhost:${PORT}`);
});
