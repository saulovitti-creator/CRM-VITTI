import "dotenv/config";
import mysql from "mysql2/promise";
import { hashPassword } from "../../server/auth-utils";

type CountRow = { count: number };
type ExistsRow = { exists_count: number };
type ConstraintRow = { CONSTRAINT_NAME: string };
type IndexRow = { INDEX_NAME: string };
type ColumnDefaultRow = { COLUMN_DEFAULT: string | null };
type IdRow = { id: number };
type StageRow = {
  id: number;
  name: string;
  isFinal: number | boolean | null;
  finalType: string | null;
  is_active_in_funnel: number | boolean | null;
  displayOrder: number;
};

type StageSpec = {
  name: string;
  isFinal: boolean;
  finalType: string | null;
  isActiveInFunnel: boolean;
  displayOrder: number;
};

const PIPELINE_NAME = "Pipeline Principal";
const ADMIN_USERNAME = "vlicrm";
const ADMIN_PASSWORD = "vlicrm";
const ADMIN_EMAIL = "admin@vlicrm.local";

const STAGE_SPECS: StageSpec[] = [
  { name: "Primeiro Contato", isFinal: false, finalType: null, isActiveInFunnel: true, displayOrder: 0 },
  { name: "Não Respondeu", isFinal: false, finalType: null, isActiveInFunnel: true, displayOrder: 1 },
  { name: "Interessado", isFinal: false, finalType: null, isActiveInFunnel: true, displayOrder: 2 },
  { name: "Sem Interesse", isFinal: false, finalType: null, isActiveInFunnel: true, displayOrder: 3 },
  { name: "Ganho", isFinal: true, finalType: "ganho", isActiveInFunnel: false, displayOrder: 4 },
  { name: "Perdido", isFinal: true, finalType: "perdido", isActiveInFunnel: false, displayOrder: 5 },
  { name: "Abandonado", isFinal: true, finalType: "abandonado", isActiveInFunnel: false, displayOrder: 6 },
];

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
  };
}

function parseSchemaFromDatabaseUrl(databaseUrl: string): { schema: string; host: string; port: string } {
  const parsed = new URL(databaseUrl);
  const schema = parsed.pathname.replace(/^\/+/, "");
  return {
    schema,
    host: parsed.hostname,
    port: parsed.port || "3306",
  };
}

function asBoolean(value: unknown): boolean {
  return value === true || value === 1 || value === "1";
}

async function tableExists(conn: mysql.Connection, schema: string, table: string): Promise<boolean> {
  const [rows] = await conn.query<ExistsRow[]>(
    `
      SELECT COUNT(*) AS exists_count
      FROM information_schema.tables
      WHERE table_schema = ? AND table_name = ?
    `,
    [schema, table]
  );
  return Number(rows[0]?.exists_count || 0) > 0;
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
      LIMIT 1
    `,
    [schema, table, constraintName]
  );
  return rows.length > 0;
}

async function columnDefault(
  conn: mysql.Connection,
  schema: string,
  table: string,
  column: string
): Promise<string | null> {
  const [rows] = await conn.query<ColumnDefaultRow[]>(
    `
      SELECT COLUMN_DEFAULT
      FROM information_schema.columns
      WHERE table_schema = ?
        AND table_name = ?
        AND column_name = ?
      LIMIT 1
    `,
    [schema, table, column]
  );
  return rows[0]?.COLUMN_DEFAULT ?? null;
}

async function executeMaybe(conn: mysql.Connection, dryRun: boolean, sqlText: string, params: unknown[] = []) {
  if (dryRun) {
    console.log("[setup][dry-run] SQL:", sqlText);
    return;
  }
  await conn.query(sqlText, params);
}

async function ensureAdmin(conn: mysql.Connection, dryRun: boolean) {
  const [rows] = await conn.query<IdRow[]>(
    `SELECT id FROM users WHERE username = ? LIMIT 1`,
    [ADMIN_USERNAME]
  );

  if (rows.length > 0) {
    const userId = rows[0].id;
    await executeMaybe(
      conn,
      dryRun,
      `
        UPDATE users
        SET role = 'admin',
            passwordHash = ?,
            email = COALESCE(NULLIF(email, ''), ?),
            updatedAt = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      [hashPassword(ADMIN_PASSWORD), ADMIN_EMAIL, userId]
    );
    console.log(`[setup] user '${ADMIN_USERNAME}': ensured as admin`);
    return;
  }

  await executeMaybe(
    conn,
    dryRun,
    `
      INSERT INTO users (username, passwordHash, email, role, loginMethod, name)
      VALUES (?, ?, ?, 'admin', 'local', 'Admin VLI')
    `,
    [ADMIN_USERNAME, hashPassword(ADMIN_PASSWORD), ADMIN_EMAIL]
  );
  console.log(`[setup] user '${ADMIN_USERNAME}': created`);
}

async function ensurePipelinePrincipal(conn: mysql.Connection, dryRun: boolean): Promise<number> {
  const [rows] = await conn.query<IdRow[]>(
    `SELECT id FROM pipelines WHERE name = ? ORDER BY id ASC LIMIT 1`,
    [PIPELINE_NAME]
  );

  if (rows.length > 0) {
    const pipelineId = rows[0].id;
    await executeMaybe(conn, dryRun, `UPDATE pipelines SET isDefault = 1 WHERE id = ?`, [pipelineId]);
    console.log(`[setup] pipeline '${PIPELINE_NAME}': reused (id=${pipelineId})`);
    return pipelineId;
  }

  await executeMaybe(conn, dryRun, `INSERT INTO pipelines (name, isDefault) VALUES (?, 1)`, [PIPELINE_NAME]);
  const [created] = await conn.query<IdRow[]>(
    `SELECT id FROM pipelines WHERE name = ? ORDER BY id DESC LIMIT 1`,
    [PIPELINE_NAME]
  );
  const pipelineId = created?.id || 0;
  console.log(`[setup] pipeline '${PIPELINE_NAME}': created (id=${pipelineId})`);
  return pipelineId;
}

function stageNeedsUpdate(existing: StageRow, spec: StageSpec): boolean {
  const currentIsFinal = asBoolean(existing.isFinal);
  const currentIsActive = asBoolean(existing.is_active_in_funnel);
  const currentFinalType = existing.finalType || null;
  return (
    currentIsFinal !== spec.isFinal ||
    currentIsActive !== spec.isActiveInFunnel ||
    currentFinalType !== spec.finalType ||
    Number(existing.displayOrder) !== spec.displayOrder
  );
}

async function ensurePipelineStages(conn: mysql.Connection, dryRun: boolean, pipelineId: number) {
  for (const spec of STAGE_SPECS) {
    const [rows] = await conn.query<StageRow[]>(
      `
        SELECT id, name, isFinal, finalType, is_active_in_funnel, displayOrder
        FROM pipeline_stages
        WHERE pipelineId = ? AND name = ?
        ORDER BY id ASC
      `,
      [pipelineId, spec.name]
    );

    if (rows.length === 0) {
      await executeMaybe(
        conn,
        dryRun,
        `
          INSERT INTO pipeline_stages
          (pipelineId, name, color, displayOrder, isFinal, finalType, is_active_in_funnel)
          VALUES (?, ?, NULL, ?, ?, ?, ?)
        `,
        [pipelineId, spec.name, spec.displayOrder, spec.isFinal ? 1 : 0, spec.finalType, spec.isActiveInFunnel ? 1 : 0]
      );
      console.log(`[setup] stage '${spec.name}': created`);
      continue;
    }

    const primary = rows[0];
    if (rows.length > 1) {
      console.warn(
        `[setup] stage '${spec.name}': ${rows.length} entries found in pipeline ${pipelineId}, updating only id=${primary.id}`
      );
    }

    if (!stageNeedsUpdate(primary, spec)) {
      console.log(`[setup] stage '${spec.name}': already aligned`);
      continue;
    }

    await executeMaybe(
      conn,
      dryRun,
      `
        UPDATE pipeline_stages
        SET displayOrder = ?,
            isFinal = ?,
            finalType = ?,
            is_active_in_funnel = ?
        WHERE id = ?
      `,
      [spec.displayOrder, spec.isFinal ? 1 : 0, spec.finalType, spec.isActiveInFunnel ? 1 : 0, primary.id]
    );
    console.log(`[setup] stage '${spec.name}': aligned`);
  }
}

async function ensureTagsTable(conn: mysql.Connection, schema: string, dryRun: boolean) {
  const exists = await tableExists(conn, schema, "tags");
  if (exists) {
    console.log("[setup] tags: already exists");
    return;
  }

  await executeMaybe(
    conn,
    dryRun,
    `
      CREATE TABLE tags (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
        createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT tags_id PRIMARY KEY (id),
        CONSTRAINT tags_name_unique UNIQUE (name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  );
  console.log("[setup] tags: ensured");
}

async function ensureContactTags(conn: mysql.Connection, schema: string, dryRun: boolean) {
  const exists = await tableExists(conn, schema, "contact_tags");
  if (!exists) {
    await executeMaybe(
      conn,
      dryRun,
      `
        CREATE TABLE contact_tags (
          id INT NOT NULL AUTO_INCREMENT,
          contactId INT NOT NULL,
          tagId INT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT contact_tags_id PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `
    );
    console.log("[setup] contact_tags: created");
  } else {
    console.log("[setup] contact_tags: already exists");
  }

  if (!(await indexExists(conn, schema, "contact_tags", "idx_contact_tags_contactId"))) {
    await executeMaybe(conn, dryRun, `CREATE INDEX idx_contact_tags_contactId ON contact_tags (contactId)`);
  }
  if (!(await indexExists(conn, schema, "contact_tags", "idx_contact_tags_tagId"))) {
    await executeMaybe(conn, dryRun, `CREATE INDEX idx_contact_tags_tagId ON contact_tags (tagId)`);
  }
  console.log("[setup] contact_tags: indexes ensured");

  const fkContact = "contact_tags_contactId_contacts_id_fk";
  if (!(await constraintExists(conn, schema, "contact_tags", fkContact))) {
    await executeMaybe(
      conn,
      dryRun,
      `
        ALTER TABLE contact_tags
        ADD CONSTRAINT ${fkContact}
        FOREIGN KEY (contactId) REFERENCES contacts(id)
        ON DELETE NO ACTION ON UPDATE NO ACTION
      `
    );
    console.log(`[setup] contact_tags: FK ${fkContact} ensured`);
  }

  const fkTag = "contact_tags_tagId_tags_id_fk";
  if (!(await constraintExists(conn, schema, "contact_tags", fkTag))) {
    const [orphans] = await conn.query<CountRow[]>(
      `
        SELECT COUNT(*) AS count
        FROM contact_tags ct
        LEFT JOIN tags t ON t.id = ct.tagId
        WHERE t.id IS NULL
      `
    );
    const orphanCount = Number(orphans[0]?.count || 0);
    if (orphanCount > 0) {
      console.warn(
        `[setup] contact_tags: FK ${fkTag} skipped due to ${orphanCount} orphan row(s).`
      );
    } else {
      await executeMaybe(
        conn,
        dryRun,
        `
          ALTER TABLE contact_tags
          ADD CONSTRAINT ${fkTag}
          FOREIGN KEY (tagId) REFERENCES tags(id)
          ON DELETE NO ACTION ON UPDATE NO ACTION
        `
      );
      console.log(`[setup] contact_tags: FK ${fkTag} ensured`);
    }
  }
}

async function ensureCustomFieldDefinitionDefault(conn: mysql.Connection, schema: string, dryRun: boolean) {
  const exists = await tableExists(conn, schema, "custom_field_definitions");
  if (!exists) {
    console.log("[setup] custom_field_definitions: table missing, skipped");
    return;
  }

  const currentDefault = await columnDefault(conn, schema, "custom_field_definitions", "model");
  if (currentDefault === "contact") {
    console.log("[setup] custom_field_definitions.model default: already 'contact'");
    return;
  }

  if (currentDefault === "lead") {
    await executeMaybe(
      conn,
      dryRun,
      `
        ALTER TABLE custom_field_definitions
        MODIFY COLUMN model VARCHAR(50) NOT NULL DEFAULT 'contact'
      `
    );
    console.log("[setup] custom_field_definitions.model default: changed from 'lead' to 'contact'");
    return;
  }

  console.log(
    `[setup] custom_field_definitions.model default: current '${String(currentDefault)}' (left unchanged)`
  );
}

async function main() {
  const { dryRun } = parseArgs();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const nodeEnv = (process.env.NODE_ENV || "").toLowerCase();
  if (!dryRun && nodeEnv === "production") {
    throw new Error("Refusing to run setup-local-env in production mode without --dry-run");
  }

  const parsed = parseSchemaFromDatabaseUrl(databaseUrl);
  console.log("[setup] starting setup-local-env", {
    dryRun,
    host: parsed.host,
    port: parsed.port,
    database: parsed.schema,
  });

  const conn = await mysql.createConnection(databaseUrl);
  try {
    if (!(await tableExists(conn, parsed.schema, "users"))) {
      throw new Error("users table not found. Run migrations before setup-local-env.");
    }
    if (!(await tableExists(conn, parsed.schema, "pipelines"))) {
      throw new Error("pipelines table not found. Run migrations before setup-local-env.");
    }
    if (!(await tableExists(conn, parsed.schema, "pipeline_stages"))) {
      throw new Error("pipeline_stages table not found. Run migrations before setup-local-env.");
    }

    await ensureTagsTable(conn, parsed.schema, dryRun);
    await ensureContactTags(conn, parsed.schema, dryRun);
    await ensureCustomFieldDefinitionDefault(conn, parsed.schema, dryRun);
    await ensureAdmin(conn, dryRun);

    const pipelineId = await ensurePipelinePrincipal(conn, dryRun);
    if (!pipelineId) {
      throw new Error("Could not resolve Pipeline Principal id");
    }
    await ensurePipelineStages(conn, dryRun, pipelineId);

    console.log("[setup] setup-local-env completed");
  } finally {
    await conn.end();
  }
}

main().catch((error: any) => {
  console.error("[setup] failed", error);
  process.exit(1);
});
