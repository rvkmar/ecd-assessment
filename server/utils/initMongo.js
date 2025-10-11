// initMongo.js
// One-time initialization script for ecd-assessment MongoDB database

import mongoose from "mongoose";
import bcrypt from "bcrypt";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/ecd_assessment";

async function init() {
  try {
    console.log("🔗 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI, { dbName: "ecd_assessment" });

    const db = mongoose.connection.db;
    console.log("✅ Connected to", db.databaseName);

    // ------------------------------
    // 1️⃣ Create Questions Collection
    // ------------------------------
    const collections = await db.listCollections().toArray();
    const exists = collections.some((c) => c.name === "questions");

    if (!exists) {
      console.log("🆕 Creating 'questions' collection...");
      await db.createCollection("questions");
    } else {
      console.log("ℹ️ 'questions' collection already exists");
    }

    const questionColl = db.collection("questions");
    console.log("⚙️ Creating indexes on { id, status, metadata.subject, metadata.grade }...");
    await questionColl.createIndex({ id: 1 }, { unique: true });
    await questionColl.createIndex({ status: 1 });
    await questionColl.createIndex({ "metadata.subject": 1 });
    await questionColl.createIndex({ "metadata.grade": 1 });
    console.log("✅ Question indexes created successfully");

    // ------------------------------
    // 2️⃣ Create Users Collection
    // ------------------------------
    const userExists = collections.some((c) => c.name === "users");
    if (!userExists) {
      console.log("🆕 Creating 'users' collection...");
      await db.createCollection("users");
    } else {
      console.log("ℹ️ 'users' collection already exists");
    }

    const usersColl = db.collection("users");

    // 3️⃣ Default users
    const defaultUsers = [
      {
        username: "admin1",
        role: "admin",
        password: "admin123",
        email: "admin@ecd.local",
      },
      {
        username: "dist1",
        role: "district",
        password: "dist123",
        email: "district@ecd.local",
      },
      {
        username: "teach1",
        role: "teacher",
        password: "teach123",
        email: "teacher@ecd.local",
      },
    ];

    console.log("👥 Creating default users...");

    for (const user of defaultUsers) {
      const exists = await usersColl.findOne({ username: user.username });
      if (!exists) {
        const hashed = await bcrypt.hash(user.password, 10);
        await usersColl.insertOne({
          username: user.username,
          email: user.email,
          role: user.role,
          password: hashed,
          createdAt: new Date(),
        });
        console.log(`✅ Created user: ${user.username} (${user.role})`);
      } else {
        console.log(`ℹ️ User '${user.username}' already exists, skipping.`);
      }
    }

    // Indexes for users
    console.log("⚙️ Creating user indexes...");
    await usersColl.createIndex({ username: 1 }, { unique: true });
    await usersColl.createIndex({ role: 1 });
    console.log("✅ User indexes created successfully");

    // ------------------------------
    // 3️⃣ Verify setup
    // ------------------------------
    const questionIndexes = await questionColl.indexes();
    const userIndexes = await usersColl.indexes();

    console.log("📚 Question Indexes:", questionIndexes);
    console.log("📚 User Indexes:", userIndexes);

    console.log("🎉 MongoDB initialization complete for ecd_assessment");
    console.log("\n🔐 Default credentials:");
    console.log("   admin / admin123");
    console.log("   district / district123");
    console.log("   teacher / teacher123\n");
  } catch (err) {
    console.error("❌ Initialization failed:", err);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Connection closed.");
  }
}

init();
