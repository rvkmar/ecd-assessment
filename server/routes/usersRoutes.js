// usersRoutes.js
// Authentication and user management for ecd-assessment

import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { dbAdapter } from "../utils/dbAdapter.js";
import { authenticateToken, authorizeRole } from "../utils/authMiddleware.js";

const router = express.Router();

// Use the same JWT secret as in authMiddleware.js
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";

// Token expiry duration (e.g., 8 hours)
const TOKEN_EXPIRES_IN = process.env.TOKEN_EXPIRES_IN || "8h";

// ------------------------------
// POST /api/login
// ------------------------------
// Body: { username, password, role }
// Response: { token, username, role }
router.post("/login", async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: "username, password, and role are required" });
  }

  try {
    const users = await dbAdapter.list("users");
    const user = users.find((u) => u.username === username);

    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    if (user.role !== role) {
      return res.status(403).json({ error: "Role mismatch for this account" });
    }

    const token = jwt.sign(
      {
        username: user.username,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: TOKEN_EXPIRES_IN }
    );

    res.json({ token, username: user.username, role: user.role });
  } catch (err) {
    console.error("Login failed:", err);
    res.status(500).json({ error: "Server error during login" });
  }
});

// ------------------------------
// GET /api/users (Admin only)
// ------------------------------
router.get(
  "/",
  authenticateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    try {
      const users = await dbAdapter.list("users");
      res.json(users.map((u) => ({ username: u.username, role: u.role, email: u.email })));
    } catch (err) {
      console.error("Fetch users failed:", err);
      res.status(500).json({ error: "Failed to load users" });
    }
  }
);

// ------------------------------
// POST /api/users (Admin can create)
// ------------------------------
router.post(
  "/",
  authenticateToken,
  authorizeRole(["admin"]),
  async (req, res) => {
    const { username, password, role, email } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ error: "username, password, and role are required" });
    }

    try {
      const users = await dbAdapter.list("users");
      if (users.some((u) => u.username === username)) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const hashed = await bcrypt.hash(password, 10);
      const newUser = {
        username,
        password: hashed,
        role,
        email: email || "",
        createdAt: new Date(),
      };

      await dbAdapter.insert("users", newUser);
      res.status(201).json({ success: true, username, role });
    } catch (err) {
      console.error("User creation failed:", err);
      res.status(500).json({ error: "Server error creating user" });
    }
  }
);

export default router;
