import express from "express";
import { loadDB, saveDB } from "../../src/utils/db-server.js";
import { validateEntity } from "../../src/utils/schema.js";  // ✅ schema with metadata-based a/b/c

const router = express.Router();

// ------------------------------
// GET /api/questions
// ------------------------------
router.get("/", (req, res) => {
  const db = loadDB();
  res.json(db.questions || []);
});

// ------------------------------
// GET /api/questions/:id
// ------------------------------
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDB();
  if (!db.questions) db.questions = [];
  const question = db.questions.find((q) => q.id === id);
  if (!question) {
    return res.status(404).json({ error: "Question not found" });
  }
  res.json(question);
});

// ------------------------------
// POST /api/questions
// ------------------------------
router.post("/", (req, res) => {
  let {
    stem,
    type,
    options,
    correctOptionId,
    bnObservationId,
    metadata,
    a,
    b,
    c,
  } = req.body;

  if (!stem || !type) {
    return res.status(400).json({ error: "Missing required fields: stem, type" });
  }

  // ❌ Prevent placeholder submissions
  if (type === "default") {
    return res.status(400).json({ error: "Invalid question type: default" });
  }
    
  // ✅ ensure metadata object exists
  metadata = metadata || {};

  // ✅ migrate a/b/c into metadata if present
  if (a !== undefined) metadata.a = a;
  if (b !== undefined) metadata.b = b;
  if (c !== undefined) metadata.c = c;

  const db = loadDB();

  const newQuestion = {
    id: `q${Date.now()}`,
    stem,
    type,
    options: options || [],
    correctOptionId: correctOptionId || null,
    bnObservationId: bnObservationId || null,
    metadata,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // ✅ Schema validation
  const { valid, errors } = validateEntity("questions", newQuestion);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  if (!db.questions) db.questions = [];
  db.questions.push(newQuestion);
  saveDB(db);

  res.status(201).json(newQuestion);
});

// ------------------------------
// PUT /api/questions/:id
// ------------------------------
router.put("/:id", (req, res) => {
  const { id } = req.params;
  let updates = req.body;

  const db = loadDB();
  if (!db.questions) db.questions = [];
  const idx = db.questions.findIndex((q) => q.id === id);
  if (idx === -1) return res.status(404).json({ error: "Question not found" });

  // ❌ Prevent overwriting with placeholder type
  if (updates.type === "default") {
    return res.status(400).json({ error: "Invalid question type: default" });
  }
    
  // ✅ ensure metadata object exists
  let metadata = updates.metadata || { ...db.questions[idx].metadata };

  // ✅ migrate a/b/c into metadata if present
  if (updates.a !== undefined) metadata.a = updates.a;
  if (updates.b !== undefined) metadata.b = updates.b;
  if (updates.c !== undefined) metadata.c = updates.c;

  // ✅ build updated question
  const updatedQuestion = {
    ...db.questions[idx],
    ...updates,
    metadata,
    updatedAt: new Date().toISOString(),
  };

  // ✅ remove old top-level a/b/c to avoid schema mismatch
  delete updatedQuestion.a;
  delete updatedQuestion.b;
  delete updatedQuestion.c;

  // ✅ Schema validation
  const { valid, errors } = validateEntity("questions", updatedQuestion);
  if (!valid) {
    return res.status(400).json({ error: "Schema validation failed", details: errors });
  }

  db.questions[idx] = updatedQuestion;
  saveDB(db);
  res.json(updatedQuestion);
});

// ------------------------------
// PATCH /api/questions/:id/lifecycle
// Update question lifecycle (promote, retire, reactivate)
// ------------------------------
// router.patch("/:id/lifecycle", (req, res) => {
//   const { id } = req.params;
//   const { action, userId, role } = req.body; // expect role from frontend for validation & action: review|activate|retire|reactivate
//   const db = loadDB();
//   const question = db.questions?.find((q) => q.id === id);
//   if (!question) return res.status(404).json({ error: "Question not found" });

//   switch (action) {
//     case "review":
//       // Teachers can send new → review
//       if (question.status === "new") {
//         question.status = "review";
//         question.modifier = userId;
//       } else if (["active"].includes(question.status) && ["district", "admin"].includes(userId)) {
//         // District/Admin can demote active → review
//         question.status = "review";
//         question.modifier = userId;
//       } else {
//         return res.status(400).json({ error: `Cannot set status ${question.status} → review` });
//       }
//       break;

//     case "activate":
//       // Only District or Admin can promote review → active
//       if (question.status === "review" && ["district", "admin"].includes(userId)) {
//         question.status = "active";
//         question.modifier = userId;
//       } else {
//         return res.status(403).json({ error: "Only District or Admin can activate questions" });
//       }
//       break;

//     case "retire":
//       // Admin only
//       if (["admin"].includes(userId)) {
//         question.status = "retired";
//         question.modifier = userId;
//       } else {
//         return res.status(403).json({ error: "Only Admin can retire questions" });
//       }
//       break;

//     default:
//       return res.status(400).json({ error: "Invalid lifecycle action" });
//   }

//   question.updatedAt = new Date().toISOString();
//   saveDB(db);
//   res.json(question);
// });

// ------------------------------
// PATCH /api/questions/:id/lifecycle
// Update question lifecycle (promote, demote, retire)
// ------------------------------
router.patch("/:id/lifecycle", async (req, res) => {
  const { id } = req.params;
  const { action, userId, role } = req.body; // Expect role + user info from frontend

  try {
    // Get the current question from Mongo
    const question = await dbAdapter.get("questions", id);
    if (!question) {
      return res.status(404).json({ error: "Question not found" });
    }

    // Lifecycle policy enforcement
    switch (action) {
      case "review":
        // Teacher can send new → review
        if (question.status === "new" && role === "teacher") {
          question.status = "review";
          question.modifier = userId;
        }
        // District/Admin can demote active → review
        else if (question.status === "active" && ["district", "admin"].includes(role)) {
          question.status = "review";
          question.modifier = userId;
        } else {
          return res
            .status(400)
            .json({ error: `Invalid transition: ${question.status} → review` });
        }
        break;

      case "activate":
        // Only District/Admin can promote review → active
        if (question.status === "review" && ["district", "admin"].includes(role)) {
          question.status = "active";
          question.modifier = userId;
        }
        // Admin can reactivate retired → active
        else if (question.status === "retired" && role === "admin") {
          question.status = "active";
          question.modifier = userId;
          question.reactivationCount = (question.reactivationCount || 0) + 1;

          // Optional: enforce max reactivation limit
          if (
            question.maxReactivations &&
            question.reactivationCount > question.maxReactivations
          ) {
            return res
              .status(400)
              .json({ error: "Max reactivations reached for this question" });
          }
        } else {
          return res
            .status(403)
            .json({ error: "Only District/Admin can activate questions" });
        }
        break;

      case "retire":
        // Only Admin can retire
        if (role === "admin") {
          question.status = "retired";
          question.modifier = userId;
        } else {
          return res
            .status(403)
            .json({ error: "Only Admin can retire questions" });
        }
        break;

      default:
        return res.status(400).json({ error: "Invalid lifecycle action" });
    }

    question.updatedAt = new Date().toISOString();

    // Persist changes in MongoDB
    const updated = await dbAdapter.update("questions", id, question);

    res.json({ success: true, question: updated });
  } catch (err) {
    console.error("Lifecycle update failed:", err);
    res.status(500).json({ error: "Server error updating lifecycle" });
  }
});


// ------------------------------
// POST /api/questions/:id/sync-irt
// Trigger IRT sync from R backend and update Mongo
// ------------------------------
import fetch from "node-fetch";

router.post("/:id/sync-irt", async (req, res) => {
  const { id } = req.params;
  try {
    // 1️⃣ Get question
    const question = await dbAdapter.get("questions", id);
    if (!question) return res.status(404).json({ error: "Question not found" });

    // 2️⃣ Call R backend for IRT parameter estimation
    const rUrl =
      process.env.R_BACKEND_URL || "http://r-backend:4000";
    const response = await fetch(`${rUrl}/irt-estimate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: question.id,
        responses: question.responses || [],
      }),
    });

    if (!response.ok) throw new Error("R backend IRT sync failed");
    const result = await response.json();

    // 3️⃣ Update question in Mongo
    question.irtParams = {
      a: result.a,
      b: result.b,
      c: result.c,
      updatedAt: new Date().toISOString(),
      source: "R backend",
    };

    const updated = await dbAdapter.update("questions", id, question);

    res.json({
      success: true,
      irtParams: updated.irtParams,
    });
  } catch (err) {
    console.error("IRT sync failed:", err);
    res.status(500).json({ error: "Failed to sync IRT parameters" });
  }
});

// ------------------------------
// DELETE /api/questions/:id
// ------------------------------
router.delete("/:id", (req, res) => {
  const { id } = req.params;
  const db = loadDB();

  if (!db.questions) db.questions = [];
  const before = db.questions.length;
  db.questions = db.questions.filter((q) => q.id !== id);
  if (db.questions.length === before) {
    return res.status(404).json({ error: "Question not found" });
  }

  // Cascade: remove from tasks
  if (db.tasks) {
    db.tasks = db.tasks.map((t) => ({
      ...t,
      questionId: t.questionId === id ? null : t.questionId,
    }));
  }

  // Cascade: clean sessions with references
  if (db.sessions) {
    db.sessions = db.sessions.map((s) => ({
      ...s,
      responses: (s.responses || []).filter((r) => r.questionId !== id),
    }));
  }

  saveDB(db);
  res.json({ success: true });
});

export default router;
