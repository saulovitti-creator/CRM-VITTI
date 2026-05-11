import { db } from "../../server/db.js";
import { users } from "../../drizzle/schema.js";
import { hashPassword } from "../../server/_core/auth.js";
async function run() {
  const hash = await hashPassword("admin123");
  await db.insert(users).values({
    username: "admin2",
    passwordHash: hash,
    email: "admin2@crm.local",
    role: "admin",
    loginMethod: "local",
    name: "Administrador Drizzle"
  });
  console.log("Inserido!");
  process.exit(0);
}
run().catch(console.error);
