// dbAdapter.js
// Unified database adapter for ecd-assessment (JSON + MongoDB)

import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { schema } from "../../src/utils/schema.js";
import { validateEntity } from "../../src/utils/schema.js";

// ------------------------------
// Configuration
// ------------------------------
export const DB_MODE = process.env.DB_MODE || "mongo"; // "json" | "mongo"

// JSON file path
const DB_FILE = path.resolve("./data/db.json");

// MongoDB config
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ecd_assessment";

// ------------------------------
// JSON utility functions
// ------------------------------
function loadJSON() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
}

function saveJSON(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// ------------------------------
// MongoDB setup
// ------------------------------
let mongoModels = {};

async function initMongo() {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_URI, { dbName: "ecd_assessment" });
  }

  // 1️⃣ Explicit schema for Questions (with ECD fields)
  if (!mongoModels.Question) {
    const QuestionSchema = new mongoose.Schema({
      id: { type: String, unique: true },
      type: String,
      stem: String,
      status: { type: String, enum: ["new", "review", "active", "retired"] },
      creator: String,
      modifier: String,
      usageCount: { type: Number, default: 0 },
      maxUsageBeforeRetire: { type: Number, default: 5 },
      reactivationCount: { type: Number, default: 0 },
      maxReactivations: { type: Number, default: 2 },
      metadata: Object,
      irtParams: {
        a: { type: Number, default: 1.0 },
        b: { type: Number, default: 0.0 },
        c: { type: Number, default: 0.2 },
        updatedAt: Date,
        source: String,
      },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    });

    mongoModels.Question = mongoose.model("Question", QuestionSchema);
  }

  // 2️⃣ Generic dynamic schema generator for other collections
  const ensureModel = (name) => {
    if (mongoModels[name]) return mongoModels[name];

    // Define a simple flexible schema
    const GenericSchema = new mongoose.Schema(
      { any: {} },
      { strict: false, timestamps: true }
    );

    mongoModels[name] = mongoose.model(name, GenericSchema);
    return mongoModels[name];
  };

  // Ensure common ones are initialized
  ensureModel("User");
  ensureModel("Task");
  ensureModel("Session");
  ensureModel("Policy");
  ensureModel("EvidenceModel");
  ensureModel("CompetencyModel");

  return mongoModels;
}


// ------------------------------
// CRUD adapter
// ------------------------------
export const dbAdapter = {
  async list(collection) {
    if (DB_MODE === "json") {
      const db = loadJSON();
      return db[collection] || [];
    }

    const models = await initMongo();
    const Model = models[capitalize(collection)];
    return await Model.find().lean();
  },

  async get(collection, id) {
    if (DB_MODE === "json") {
      const db = loadJSON();
      return db[collection]?.find((x) => x.id === id);
    }

    const models = await initMongo();
    const Model = models[capitalize(collection)];
    return await Model.findOne({ id }).lean();
  },

  async insert(collection, obj) {
    const { valid, errors } = validateEntity(collection, obj);
    if (!valid) throw new Error(errors.join(", "));

    obj.createdAt = new Date().toISOString();
    obj.updatedAt = new Date().toISOString();

    if (DB_MODE === "json") {
      const db = loadJSON();
      db[collection] = db[collection] || [];
      db[collection].push(obj);
      saveJSON(db);
      return obj;
    }

    const models = await initMongo();
    const Model = models[capitalize(collection)];
    return await Model.create(obj);
  },

  async update(collection, id, updates) {
    updates.updatedAt = new Date().toISOString();

    if (DB_MODE === "json") {
      const db = loadJSON();
      const idx = db[collection]?.findIndex((x) => x.id === id);
      if (idx === -1) throw new Error("Not found");
      db[collection][idx] = { ...db[collection][idx], ...updates };
      saveJSON(db);
      return db[collection][idx];
    }

    const models = await initMongo();
    const Model = models[capitalize(collection)];
    return await Model.findOneAndUpdate({ id }, updates, { new: true }).lean();
  },

  async remove(collection, id) {
    if (DB_MODE === "json") {
      const db = loadJSON();
      db[collection] = db[collection]?.filter((x) => x.id !== id);
      saveJSON(db);
      return true;
    }

    const models = await initMongo();
    const Model = models[capitalize(collection)];
    await Model.deleteOne({ id });
    return true;
  },
};

function capitalize(str) {
  if (!str) return "";
  // Strip trailing "s" to singularize if plural
  const base = str.endsWith("s") ? str.slice(0, -1) : str;
  return base.charAt(0).toUpperCase() + base.slice(1);
}


// ------------------------------
// Usage example:
// import { dbAdapter } from './dbAdapter.js';
// const list = await dbAdapter.list('questions');
// ------------------------------
