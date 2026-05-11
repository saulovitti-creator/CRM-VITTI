import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import { users } from "../../drizzle/schema.js";

async function test() {
  try {
    console.log("DATABASE_URL:", process.env.DATABASE_URL);
    // This is how server/db.ts does it
    const db = drizzle(process.env.DATABASE_URL);
    console.log("Drizzle instance created");
    
    // Now try to query
    const result = await db.select().from(users).limit(1);
    console.log("Query result:", result);
  } catch (err: any) {
    console.error("Query failed with error:", err.message);
    if (err.cause) {
      console.error("Cause:", err.cause);
    } else {
      console.error("Full error:", err);
    }
  }
}

test();
