import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("No DATABASE_URL");

  const connection = await mysql.createConnection(url);

  console.log("Checking if pipelines exist...");
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
  
  await connection.end();
}

run().catch(console.error);
