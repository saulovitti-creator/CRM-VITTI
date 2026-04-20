const crypto = require("crypto");
const salt = crypto.randomBytes(16).toString("hex");
const h = crypto.pbkdf2Sync("admin123", salt, 1000, 64, "sha256").toString("hex");
console.log(`${salt}:${h}`);
