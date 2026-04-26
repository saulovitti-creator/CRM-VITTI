import { getDb } from "./server/db";
import { opportunities } from "./drizzle/schema";

async function run() {
  const db = await getDb();
  if (!db) {
    console.log("No DB");
    return;
  }
  const opps = await db.select().from(opportunities).limit(5);
  console.log("Opportunities:", opps.map(o => ({ id: o.id, title: o.title, monetaryValue: o.monetaryValue })));
}
run().catch(console.error).then(() => process.exit(0));
