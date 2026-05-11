import "dotenv/config";
import mysql from 'mysql2/promise';

async function migrate() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not found in environment variables.");
    process.exit(1);
  }

  const connection = await mysql.createConnection(dbUrl);
  console.log("Connected to TiDB!\n");
  console.log("=== Sprint 2: Creating Custom Fields tables ===\n");

  try {
    // 1. Create custom_field_definitions table
    console.log("1. Creating custom_field_definitions table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`custom_field_definitions\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`name\` varchar(255) NOT NULL,
        \`fieldType\` varchar(50) NOT NULL,
        \`model\` varchar(50) NOT NULL DEFAULT 'lead',
        \`groupName\` varchar(100),
        \`placeholder\` varchar(255),
        \`options\` text,
        \`isRequired\` boolean DEFAULT false,
        \`displayOrder\` int NOT NULL DEFAULT 0,
        \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT \`custom_field_definitions_id\` PRIMARY KEY(\`id\`)
      )
    `);
    console.log("   ✅ custom_field_definitions created.\n");

    // 2. Create custom_field_values table
    console.log("2. Creating custom_field_values table...");
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS \`custom_field_values\` (
        \`id\` int AUTO_INCREMENT NOT NULL,
        \`definitionId\` int NOT NULL,
        \`entityId\` int NOT NULL,
        \`entityType\` varchar(50) NOT NULL DEFAULT 'lead',
        \`value\` text,
        \`createdAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updatedAt\` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        CONSTRAINT \`custom_field_values_id\` PRIMARY KEY(\`id\`),
        CONSTRAINT \`custom_field_values_definitionId_fk\` FOREIGN KEY (\`definitionId\`) REFERENCES \`custom_field_definitions\`(\`id\`)
      )
    `);
    console.log("   ✅ custom_field_values created.\n");

    // 3. Add composite index for fast entity lookups
    console.log("3. Adding index for entity lookups...");
    try {
      await connection.execute(`
        CREATE INDEX \`idx_cfv_entity\` ON \`custom_field_values\`(\`entityType\`, \`entityId\`)
      `);
      console.log("   ✅ Index idx_cfv_entity created.\n");
    } catch (e: any) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log("   ⏭️  Index already exists, skipping.\n");
      } else {
        throw e;
      }
    }

    // 4. Add index for definition FK lookups
    console.log("4. Adding index for definition lookups...");
    try {
      await connection.execute(`
        CREATE INDEX \`idx_cfv_definition\` ON \`custom_field_values\`(\`definitionId\`)
      `);
      console.log("   ✅ Index idx_cfv_definition created.\n");
    } catch (e: any) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log("   ⏭️  Index already exists, skipping.\n");
      } else {
        throw e;
      }
    }

    console.log("=== Migration complete! ===");
  } catch (err) {
    console.error("Migration error:", err);
  } finally {
    await connection.end();
  }
}

migrate();
