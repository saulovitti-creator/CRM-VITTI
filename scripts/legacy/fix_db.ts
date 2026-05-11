import { config } from 'dotenv';
config();
import { getDb } from '../../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB connection"); process.exit(1); }

  try {
    await db.execute(sql.raw(`ALTER TABLE leads ADD COLUMN lastContactAt DATETIME;`));
    console.log("lastContactAt adicionada");
  } catch(e: any) {
    console.log(e.message);
  }
  process.exit(0);
}
main();
