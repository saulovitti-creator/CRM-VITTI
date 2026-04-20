import mysql from 'mysql2/promise';

async function migrate() {
  const connection = await mysql.createConnection(
    'mysql://4UWLuDR215YJ1TN.root:jdSxz7HPXYhy1nKF@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}'
  );

  console.log("Connected to TiDB!");

  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`tasks\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`prospectId\` varchar(255) NOT NULL,
        \`title\` varchar(255) NOT NULL,
        \`description\` text,
        \`dueDate\` datetime NOT NULL,
        \`priority\` varchar(50) NOT NULL DEFAULT 'media',
        \`status\` varchar(50) NOT NULL DEFAULT 'pendente',
        \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`completedAt\` datetime,
        CONSTRAINT \`tasks_id\` PRIMARY KEY(\`id\`)
      );
    `);
    console.log("Tasks table created/verified.");
    
    try {
      await connection.execute(`ALTER TABLE \`lead_notes\` ADD COLUMN \`type\` varchar(20) NOT NULL DEFAULT 'USER';`);
      console.log("Column 'type' added to lead_notes.");
    } catch(e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("Column 'type' already exists in lead_notes.");
      } else {
        throw e;
      }
    }
    
    try {
      await connection.execute(`ALTER TABLE \`lead_notes\` ADD COLUMN \`noteType\` varchar(20) NOT NULL DEFAULT 'USER';`);
      console.log("Column 'noteType' added to lead_notes.");
    } catch(e: any) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log("Column 'noteType' already exists in lead_notes.");
      } else {
        throw e;
      }
    }

    console.log("Migration successful!");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await connection.end();
  }
}

migrate();
