import mysql from 'mysql2/promise';
import fs from 'fs';

async function run() {
  const url = 'mysql://4UWLuDR215YJ1TN.root:jdSxz7HPXYhy1nKF@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}';

  console.log("Connecting to TiDB...", url);
  const connection = await mysql.createConnection(url);

  console.log("Reading migration file...");
  const sqlContent = fs.readFileSync('./drizzle/0003_careless_cassandra_nova.sql', 'utf-8');
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
  
  console.log('Checking if pipelines exist...');
  const [rows]: any = await connection.query('SELECT COUNT(*) as count FROM pipelines');
  
  if (rows[0].count === 0) {
    console.log("No pipelines found. Seeding default pipeline...");
    const [result]: any = await connection.query('INSERT INTO pipelines (name, isDefault) VALUES (?, ?)', ['Pipeline Principal', true]);
    const pipelineId = result.insertId;

    const stages = [
      { name: 'Entrar em contato', color: '#6366f1', order: 0, isFinal: false, finalType: null },
      { name: 'Contatado', color: '#818cf8', order: 1, isFinal: false, finalType: null },
      { name: 'Em Andamento', color: '#a5b4fc', order: 2, isFinal: false, finalType: null },
      { name: 'Proposta Enviada', color: '#e0e7ff', order: 3, isFinal: false, finalType: null },
      { name: 'Ganho', color: '#10b981', order: 4, isFinal: true, finalType: 'ganho' },
      { name: 'Perdido', color: '#ef4444', order: 5, isFinal: true, finalType: 'perdido' }
    ];

    for (const stage of stages) {
      await connection.query(
        'INSERT INTO pipeline_stages (pipelineId, name, color, displayOrder, isFinal, finalType) VALUES (?, ?, ?, ?, ?, ?)',
        [pipelineId, stage.name, stage.color, stage.order, stage.isFinal, stage.finalType]
      );
    }
    console.log("Default pipeline seeded successfully!");
  } else {
    console.log("Pipelines already exist. Skipping seed.");
  }
  
  console.log('Done running SPRINT 3 migration on TiDB.');
  await connection.end();
}

run().catch(console.error);
