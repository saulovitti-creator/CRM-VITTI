import "dotenv/config";
import { getDb } from "../../server/db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

async function main() {
  const db = await getDb();
  if (!db) {
    console.log("No DB connection");
    process.exit(1);
  }
  const result = await db.select().from(users).where(eq(users.email, "vlisinteligencia@gmail.com"));
  console.log("USER DATA:", JSON.stringify(result, null, 2));
  process.exit(0);
}

main().catch(console.error);
