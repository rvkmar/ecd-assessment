import fs from "fs";
import bcrypt from "bcrypt";

const raw = [
  { username: "admin1", password: "admin123", role: "admin" },
  { username: "dist1", password: "dist123", role: "district" },
  { username: "teach1", password: "teach123", role: "teacher" },
  { username: "stud1", password: "stud123", role: "student" }
];

const saltRounds = 10;
const hashedUsers = raw.map(u => ({
  username: u.username,
  role: u.role,
  password: bcrypt.hashSync(u.password, saltRounds) // hashed
}));

fs.writeFileSync("./users.json", JSON.stringify(hashedUsers, null, 2));
console.log("users.json updated with hashed passwords");
