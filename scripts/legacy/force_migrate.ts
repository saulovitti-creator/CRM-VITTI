import mysql from 'mysql2/promise';
import fs from 'fs';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("No DATABASE_URL");

  console.log("Connecting to", url);
  const connection = await mysql.createConnection(url);

  const sqlContent = fs.readFileSync('../../drizzle/0003_careless_cassandra_nova.sql', 'utf-8');
  const statements = sqlContent.split('--> statement-breakpoint');
  
  for (let stmt of statements) {
    stmt = stmt.trim();
    if (stmt) {
      console.log('Executing:', stmt.substring(0, 50) + '...');
      try {
        await connection.query(stmt);
      } catch (e) {
        console.error('Error on statement:', e.message);
      }
    }
  }
  console.log('Done running SPRINT 3 migration.');
  await connection.end();
}

run().catch(console.error);
