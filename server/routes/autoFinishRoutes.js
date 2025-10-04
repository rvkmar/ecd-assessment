 // server/routes/autoFinishRoutes.js
 import express from "express";
 import { autoFinishDueSessions } from "../utils/autoFinish.js";
 import { loadDB, saveDB } from "../../src/utils/db-server.js";
 
 const router = express.Router();
 
 // ------------------------------
 // POST /api/admin/auto-finish/run
 // Run sweeping job immediately (admin only ideally)
 // ------------------------------
 router.post("/admin/auto-finish/run", (req, res) => {
   try {
     const changed = autoFinishDueSessions();
     res.json({ success: true, changed });
   } catch (err) {
     console.error(err);
     res.status(500).json({ success: false, error: err.message });
   }
 });
 
 // ------------------------------
 // POST /api/sessions/:id/force-finish
 // Teacher/admin can force finish a session
 // ------------------------------
 router.post("/sessions/:id/force-finish", (req, res) => {
   const { id } = req.params;
   const db = loadDB();
 
   const idx = (db.sessions || []).findIndex((s) => s.id === id);
   if (idx === -1) {
     return res.status(404).json({ error: "Session not found" });
   }
 
   const session = db.sessions[idx];
 
   if (session.status === "submitted" && session.isCompleted) {
     return res.json({ success: true, message: "Already submitted", id });
   }
 
   const now = new Date();
   session.status = "submitted";
   session.isCompleted = true;
   session.autoFinished = false; // teacher override, not auto
   session.finishedAt = now.toISOString();
   session.updatedAt = now.toISOString();
 
   session.responses = session.responses || [];
   for (const r of session.responses) {
     r.locked = true;
     r.submittedAt = r.submittedAt || now.toISOString();
   }
 
   db.sessions[idx] = session;
   saveDB(db);
 
   res.json({ success: true, id });
 });
 
 export default router;
