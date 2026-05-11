import { config } from 'dotenv';
config();
import { getDb } from '../../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  const db = await getDb();
  if (!db) { console.error("No DB connection"); process.exit(1); }

  try {
    await db.execute(sql.raw(`ALTER TABLE lead_notes ADD COLUMN noteType VARCHAR(20) NOT NULL DEFAULT 'user';`));
    console.log("noteType adicionada");
  } catch(e: any) {
    console.log(e.message);
  }

  try {
    await db.execute(sql.raw(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INT AUTO_INCREMENT PRIMARY KEY,
      leadId INT NOT NULL,
      title VARCHAR(120) NOT NULL,
      description TEXT,
      dueDate DATETIME NOT NULL,
      priority VARCHAR(10) NOT NULL DEFAULT 'media',
      completedAt DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (leadId) REFERENCES leads(id)
    );`));
    console.log("tasks table created/verified");
  } catch(e: any) {
    console.log(e.message);
  }

  process.exit(0);
}
main();
