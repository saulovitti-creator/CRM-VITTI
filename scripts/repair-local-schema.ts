import "dotenv/config";
import mysql from "mysql2/promise";

type TableExistsRow = { exists_count: number };
type ColumnDefaultRow = { COLUMN_DEFAULT: string | null };
type ConstraintRow = { CONSTRAINT_NAME: string };
type OrphanCountRow = { orphan_count: number };
type IndexRow = { INDEX_NAME: string };

async function tableExists(conn: mysql.Connection, schema: string, table: string): Promise<boolean> {
  const [rows] = await conn.query<TableExistsRow[]>(
    `
      SELECT COUNT(*) AS exists_count
      FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?
    `,
    [schema, table]
  );
  return Number(rows[0]?.exists_count || 0) > 0;
}

async function constraintExists(
  conn: mysql.Connection,
  schema: string,
  table: string,
  constraintName: string
): Promise<boolean> {
  const [rows] = await conn.query<ConstraintRow[]>(
    `
      SELECT CONSTRAINT_NAME
      FROM information_schema.table_constraints
      WHERE table_schema = ?
        AND table_name = ?
        AND constraint_name = ?
    `,
    [schema, table, constraintName]
  );
  return rows.length > 0;
}

async function indexExists(conn: mysql.Connection, schema: string, table: string, indexName: string): Promise<boolean> {
  const [rows] = await conn.query<IndexRow[]>(
    `
      SELECT INDEX_NAME
      FROM information_schema.statistics
      WHERE table_schema = ?
        AND table_name = ?
        AND index_name = ?
      LIMIT 1
    `,
    [schema, table, indexName]
  );
  return rows.length > 0;
}

async function ensureTagsTable(conn: mysql.Connection, schema: string): Promise<void> {
  const exists = await tableExists(conn, schema, "tags");
  if (exists) {
    console.log("[repair] tags: already exists");
    return;
  }

  console.log("[repair] tags: creating table");
  await conn.execute(`
    CREATE TABLE tags (
      id INT NOT NULL AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT tags_id PRIMARY KEY (id),
      CONSTRAINT tags_name_unique UNIQUE (name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  console.log("[repair] tags: created");
}

async function ensureContactTagsTable(conn: mysql.Connection, schema: string): Promise<void> {
  const exists = await tableExists(conn, schema, "contact_tags");
  if (!exists) {
    console.log("[repair] contact_tags: creating table");
    await conn.execute(`
      CREATE TABLE contact_tags (
        id INT NOT NULL AUTO_INCREMENT,
        contactId INT NOT NULL,
        tagId INT NOT NULL,
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT contact_tags_id PRIMARY KEY (id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("[repair] contact_tags: created");
  } else {
    console.log("[repair] contact_tags: already exists");
  }

  const indexContact = "idx_contact_tags_contactId";
  if (!(await indexExists(conn, schema, "contact_tags", indexContact))) {
    await conn.execute("CREATE INDEX idx_contact_tags_contactId ON contact_tags (contactId)");
  }

  const indexTag = "idx_contact_tags_tagId";
  if (!(await indexExists(conn, schema, "contact_tags", indexTag))) {
    await conn.execute("CREATE INDEX idx_contact_tags_tagId ON contact_tags (tagId)");
  }
  console.log("[repair] contact_tags: indexes ensured");

  const fkContact = "contact_tags_contactId_contacts_id_fk";
  if (!(await constraintExists(conn, schema, "contact_tags", fkContact))) {
    console.log(`[repair] contact_tags: adding FK ${fkContact}`);
    await conn.execute(`
      ALTER TABLE contact_tags
      ADD CONSTRAINT ${fkContact}
      FOREIGN KEY (contactId) REFERENCES contacts(id)
      ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  } else {
    console.log(`[repair] contact_tags: FK ${fkContact} already exists`);
  }

  const fkTag = "contact_tags_tagId_tags_id_fk";
  if (!(await constraintExists(conn, schema, "contact_tags", fkTag))) {
    const [orphans] = await conn.query<OrphanCountRow[]>(
      `
        SELECT COUNT(*) AS orphan_count
        FROM contact_tags ct
        LEFT JOIN tags t ON t.id = ct.tagId
        WHERE t.id IS NULL
      `
    );
    const orphanCount = Number(orphans[0]?.orphan_count || 0);

    if (orphanCount > 0) {
      console.warn(
        `[repair] contact_tags: FK ${fkTag} NOT added because ${orphanCount} orphan row(s) were found in contact_tags.tagId`
      );
      console.warn("[repair] contact_tags: fix orphan rows first, then run repair-local-schema again");
    } else {
      console.log(`[repair] contact_tags: adding FK ${fkTag}`);
      await conn.execute(`
        ALTER TABLE contact_tags
        ADD CONSTRAINT ${fkTag}
        FOREIGN KEY (tagId) REFERENCES tags(id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
      `);
    }
  } else {
    console.log(`[repair] contact_tags: FK ${fkTag} already exists`);
  }
}

async function ensureCustomFieldDefinitionsDefault(conn: mysql.Connection, schema: string): Promise<void> {
  const exists = await tableExists(conn, schema, "custom_field_definitions");
  if (!exists) {
    console.log("[repair] custom_field_definitions: table missing, skipping default check");
    return;
  }

  const [rows] = await conn.query<ColumnDefaultRow[]>(
    `
      SELECT COLUMN_DEFAULT
      FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = 'custom_field_definitions'
        AND column_name = 'model'
      LIMIT 1
    `,
    [schema]
  );
  const currentDefault = rows[0]?.COLUMN_DEFAULT;

  if (currentDefault === "contact") {
    console.log("[repair] custom_field_definitions.model default: already 'contact'");
    return;
  }

  if (currentDefault === "lead") {
    console.log("[repair] custom_field_definitions.model default: changing from 'lead' to 'contact'");
    await conn.execute(`
      ALTER TABLE custom_field_definitions
      MODIFY COLUMN model VARCHAR(50) NOT NULL DEFAULT 'contact'
    `);
    console.log("[repair] custom_field_definitions.model default: updated to 'contact'");
    return;
  }

  console.log(
    `[repair] custom_field_definitions.model default: current value is '${String(currentDefault)}', leaving unchanged`
  );
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const parsed = new URL(databaseUrl);
  const schema = parsed.pathname.replace(/^\//, "");

  console.log("[repair] starting local schema repair", {
    host: parsed.hostname,
    port: parsed.port || "3306",
    database: schema,
  });

  const conn = await mysql.createConnection(databaseUrl);
  try {
    await ensureTagsTable(conn, schema);
    await ensureContactTagsTable(conn, schema);
    await ensureCustomFieldDefinitionsDefault(conn, schema);
    console.log("[repair] completed");
  } finally {
    await conn.end();
  }
}

main().catch((error: any) => {
  console.error("[repair] failed", error);
  process.exit(1);
});
