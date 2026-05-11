/**
 * Sprint 3 Migration Script
 * =========================
 * Creates the new tables (contacts, pipelines, pipeline_stages, opportunities, etc.)
 * and migrates existing data from the legacy "leads" table into the new structure.
 *
 * IMPORTANT: Run migrate_custom_fields.ts BEFORE this script if not already done.
 *
 * Usage: npx tsx migrate_sprint3.ts
 */

import 'dotenv/config';
import mysql from 'mysql2/promise';

async function migrate() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('❌ DATABASE_URL not set in .env');
    process.exit(1);
  }

  // Parse the connection URL
  const parsed = new URL(url.replace(/^mysql:\/\//, 'http://'));
  const sslParam = parsed.searchParams.get('ssl');

  const connection = await mysql.createConnection({
    host: parsed.hostname,
    port: parseInt(parsed.port) || 4000,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace('/', ''),
    ssl: sslParam ? { rejectUnauthorized: true } : undefined,
  });

  console.log('✅ Connected to TiDB!\n');

  // ========================================================================
  // PHASE 1: Create new tables
  // ========================================================================
  console.log('=== PHASE 1: Creating new tables ===\n');

  // 0a. tags (Sprint 1 — may not exist in this DB yet)
  console.log('0a. Creating "tags" table (if missing)...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS tags (
      id INT AUTO_INCREMENT NOT NULL,
      name VARCHAR(100) NOT NULL,
      color VARCHAR(7) NOT NULL DEFAULT '#3b82f6',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT tags_id PRIMARY KEY (id),
      CONSTRAINT tags_name_unique UNIQUE (name)
    );
  `);
  console.log('   ✅ tags ensured.\n');

  // 0b. lead_tags (Sprint 1 — may not exist)
  console.log('0b. Creating "lead_tags" table (if missing)...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS lead_tags (
      id INT AUTO_INCREMENT NOT NULL,
      leadId INT NOT NULL,
      tagId INT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT lead_tags_id PRIMARY KEY (id)
    );
  `);
  console.log('   ✅ lead_tags ensured.\n');

  // 1. contacts
  console.log('1. Creating "contacts" table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS contacts (
      id INT AUTO_INCREMENT NOT NULL,
      name VARCHAR(255) NOT NULL,
      company VARCHAR(255),
      phone VARCHAR(50),
      email VARCHAR(255),
      city VARCHAR(255),
      site VARCHAR(255),
      segment VARCHAR(255),
      source VARCHAR(100),
      notes TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT contacts_id PRIMARY KEY (id)
    );
  `);
  console.log('   ✅ contacts created.\n');

  // 2. contact_tags
  console.log('2. Creating "contact_tags" table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS contact_tags (
      id INT AUTO_INCREMENT NOT NULL,
      contactId INT NOT NULL,
      tagId INT NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT contact_tags_id PRIMARY KEY (id),
      CONSTRAINT fk_ct_contact FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE CASCADE,
      CONSTRAINT fk_ct_tag FOREIGN KEY (tagId) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);
  console.log('   ✅ contact_tags created.\n');

  // 3. pipelines
  console.log('3. Creating "pipelines" table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS pipelines (
      id INT AUTO_INCREMENT NOT NULL,
      name VARCHAR(255) NOT NULL,
      isDefault BOOLEAN DEFAULT FALSE,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT pipelines_id PRIMARY KEY (id)
    );
  `);
  console.log('   ✅ pipelines created.\n');

  // 4. pipeline_stages
  console.log('4. Creating "pipeline_stages" table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS pipeline_stages (
      id INT AUTO_INCREMENT NOT NULL,
      pipelineId INT NOT NULL,
      name VARCHAR(255) NOT NULL,
      color VARCHAR(50),
      displayOrder INT NOT NULL DEFAULT 0,
      isFinal BOOLEAN DEFAULT FALSE,
      finalType VARCHAR(20),
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT pipeline_stages_id PRIMARY KEY (id),
      CONSTRAINT fk_ps_pipeline FOREIGN KEY (pipelineId) REFERENCES pipelines(id) ON DELETE CASCADE
    );
  `);
  console.log('   ✅ pipeline_stages created.\n');

  // 5. opportunities
  console.log('5. Creating "opportunities" table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS opportunities (
      id INT AUTO_INCREMENT NOT NULL,
      contactId INT NOT NULL,
      pipelineId INT NOT NULL,
      stageId INT NOT NULL,
      title VARCHAR(255) NOT NULL,
      monetaryValue DECIMAL(10, 2),
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      segment VARCHAR(255),
      source VARCHAR(100),
      notes TEXT,
      wonAt DATETIME,
      lostAt DATETIME,
      lostReason TEXT,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT opportunities_id PRIMARY KEY (id),
      CONSTRAINT fk_opp_contact FOREIGN KEY (contactId) REFERENCES contacts(id) ON DELETE CASCADE,
      CONSTRAINT fk_opp_pipeline FOREIGN KEY (pipelineId) REFERENCES pipelines(id),
      CONSTRAINT fk_opp_stage FOREIGN KEY (stageId) REFERENCES pipeline_stages(id)
    );
  `);
  console.log('   ✅ opportunities created.\n');

  // 6. opportunity_notes
  console.log('6. Creating "opportunity_notes" table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS opportunity_notes (
      id INT AUTO_INCREMENT NOT NULL,
      opportunityId INT NOT NULL,
      content TEXT NOT NULL,
      noteType VARCHAR(20) NOT NULL DEFAULT 'user',
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT opportunity_notes_id PRIMARY KEY (id),
      CONSTRAINT fk_on_opp FOREIGN KEY (opportunityId) REFERENCES opportunities(id) ON DELETE CASCADE
    );
  `);
  console.log('   ✅ opportunity_notes created.\n');

  // 7. opportunity_tasks
  console.log('7. Creating "opportunity_tasks" table...');
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS opportunity_tasks (
      id INT AUTO_INCREMENT NOT NULL,
      opportunityId INT NOT NULL,
      title VARCHAR(120) NOT NULL,
      description TEXT,
      dueDate DATETIME NOT NULL,
      priority VARCHAR(10) NOT NULL DEFAULT 'media',
      completedAt DATETIME,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT opportunity_tasks_id PRIMARY KEY (id),
      CONSTRAINT fk_ot_opp FOREIGN KEY (opportunityId) REFERENCES opportunities(id) ON DELETE CASCADE
    );
  `);
  console.log('   ✅ opportunity_tasks created.\n');

  // ========================================================================
  // PHASE 2: Seed default pipeline with stages matching current statuses
  // ========================================================================
  console.log('=== PHASE 2: Seeding default pipeline ===\n');

  // Check if a pipeline already exists (idempotent)
  const [existingPipelines] = await connection.execute('SELECT id FROM pipelines LIMIT 1') as any[];
  
  let defaultPipelineId: number;

  if (existingPipelines.length === 0) {
    const [pipelineResult] = await connection.execute(
      `INSERT INTO pipelines (name, isDefault) VALUES ('Pipeline Principal', true)`
    ) as any[];
    defaultPipelineId = pipelineResult.insertId;
    console.log(`   ✅ Pipeline "Pipeline Principal" created (ID: ${defaultPipelineId})\n`);

    // Insert stages matching current lead statuses
    const stages = [
      { name: 'Entrar em contato', color: '#3b82f6', order: 0, isFinal: false, finalType: null },
      { name: 'Contatado',         color: '#f59e0b', order: 1, isFinal: false, finalType: null },
      { name: 'Não Respondeu',     color: '#64748b', order: 2, isFinal: false, finalType: null },
      { name: 'Interessado',       color: '#22c55e', order: 3, isFinal: false, finalType: null },
      { name: 'Não possui Interesse', color: '#475569', order: 4, isFinal: false, finalType: null },
      { name: 'Perdido',           color: '#ef4444', order: 5, isFinal: true,  finalType: 'perdido' },
      { name: 'Abandonado',        color: '#6b7280', order: 6, isFinal: true,  finalType: 'abandonado' },
      { name: 'Ganho',             color: '#10b981', order: 7, isFinal: true,  finalType: 'ganho' },
    ];

    for (const stage of stages) {
      await connection.execute(
        `INSERT INTO pipeline_stages (pipelineId, name, color, displayOrder, isFinal, finalType)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [defaultPipelineId, stage.name, stage.color, stage.order, stage.isFinal, stage.finalType]
      );
    }
    console.log('   ✅ 8 stages inserted for default pipeline.\n');
  } else {
    defaultPipelineId = existingPipelines[0].id;
    console.log(`   ⏭️  Pipeline already exists (ID: ${defaultPipelineId}), skipping seed.\n`);
  }

  // ========================================================================
  // PHASE 3: Migrate existing leads → contacts + opportunities
  // ========================================================================
  console.log('=== PHASE 3: Migrating existing leads ===\n');

  // Check if contacts already exist (idempotent check)
  const [existingContacts] = await connection.execute('SELECT COUNT(*) as cnt FROM contacts') as any[];
  
  if (existingContacts[0].cnt > 0) {
    console.log(`   ⏭️  Contacts table already has ${existingContacts[0].cnt} records. Skipping migration to avoid duplicates.\n`);
  } else {
    // Fetch all leads
    const [allLeads] = await connection.execute('SELECT * FROM leads ORDER BY id') as any[];
    console.log(`   Found ${allLeads.length} leads to migrate.\n`);

    if (allLeads.length > 0) {
      // Get all stages for the default pipeline (for mapping status → stageId)
      const [allStages] = await connection.execute(
        'SELECT id, name FROM pipeline_stages WHERE pipelineId = ?',
        [defaultPipelineId]
      ) as any[];

      const stageMap: Record<string, number> = {};
      for (const stage of allStages) {
        stageMap[stage.name] = stage.id;
      }

      // Fallback stage (first one) for unknown statuses
      const fallbackStageId = allStages[0]?.id;

      let contactsCreated = 0;
      let opportunitiesCreated = 0;

      for (const lead of allLeads) {
        // 3a. Create the Contact
        const contactName = lead.contactName || lead.companyName;
        const [contactResult] = await connection.execute(
          `INSERT INTO contacts (name, company, phone, email, city, site, segment, notes, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            contactName,
            lead.companyName,
            lead.phone || null,
            lead.email || null,
            lead.city || null,
            lead.site || null,
            lead.segment || null,
            null, // notes for contact (general notes stay in opportunity)
            lead.dataCriacao || lead.createdAt,
          ]
        ) as any[];
        const contactId = contactResult.insertId;
        contactsCreated++;

        // 3b. Migrate lead_tags → contact_tags
        const [leadTagRows] = await connection.execute(
          'SELECT tagId FROM lead_tags WHERE leadId = ?',
          [lead.id]
        ) as any[];

        for (const row of leadTagRows) {
          await connection.execute(
            'INSERT INTO contact_tags (contactId, tagId) VALUES (?, ?)',
            [contactId, row.tagId]
          );
        }

        // 3c. Determine the opportunity status and stage
        const stageId = stageMap[lead.status] || fallbackStageId;
        let oppStatus = 'open';
        let wonAt = null;
        let lostAt = null;

        if (lead.statusFinal === 'ganho' || lead.status === 'Ganho') {
          oppStatus = 'won';
          wonAt = lead.dataStatusFinal || lead.updatedAt;
        } else if (lead.statusFinal === 'perdido' || lead.status === 'Perdido') {
          oppStatus = 'lost';
          lostAt = lead.dataStatusFinal || lead.updatedAt;
        } else if (lead.statusFinal === 'abandonado' || lead.status === 'Abandonado') {
          oppStatus = 'abandoned';
          lostAt = lead.dataStatusFinal || lead.updatedAt;
        }

        // 3d. Calculate monetary value
        const implVal = parseFloat(lead.implementationValue) || 0;
        const recVal = parseFloat(lead.recurringValue) || 0;
        const closedVal = parseFloat(lead.valorFechado) || 0;
        const monetaryValue = closedVal > 0 ? closedVal : (implVal + recVal > 0 ? implVal + recVal : null);

        // 3e. Create the Opportunity
        const [oppResult] = await connection.execute(
          `INSERT INTO opportunities 
           (contactId, pipelineId, stageId, title, monetaryValue, status, segment, notes, wonAt, lostAt, lostReason, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            contactId,
            defaultPipelineId,
            stageId,
            lead.companyName,
            monetaryValue,
            oppStatus,
            lead.segment || null,
            lead.notes || null,
            wonAt,
            lostAt,
            lead.motivoSaida || null,
            lead.dataCriacao || lead.createdAt,
          ]
        ) as any[];
        const oppId = oppResult.insertId;
        opportunitiesCreated++;

        // 3f. Migrate lead_notes → opportunity_notes
        const [leadNoteRows] = await connection.execute(
          'SELECT content, noteType, createdAt FROM lead_notes WHERE leadId = ?',
          [lead.id]
        ) as any[];

        for (const note of leadNoteRows) {
          await connection.execute(
            'INSERT INTO opportunity_notes (opportunityId, content, noteType, createdAt) VALUES (?, ?, ?, ?)',
            [oppId, note.content, note.noteType, note.createdAt]
          );
        }

        // 3g. Migrate tasks → opportunity_tasks
        const [leadTaskRows] = await connection.execute(
          'SELECT title, description, dueDate, priority, completedAt, createdAt FROM tasks WHERE leadId = ?',
          [lead.id]
        ) as any[];

        for (const task of leadTaskRows) {
          await connection.execute(
            `INSERT INTO opportunity_tasks (opportunityId, title, description, dueDate, priority, completedAt, createdAt)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [oppId, task.title, task.description, task.dueDate, task.priority, task.completedAt, task.createdAt]
          );
        }

        // 3h. Migrate custom_field_values (entityType "lead" → link to contact)
        await connection.execute(
          `UPDATE custom_field_values SET entityId = ?, entityType = 'contact' WHERE entityId = ? AND entityType = 'lead'`,
          [contactId, lead.id]
        );
      }

      console.log(`   ✅ ${contactsCreated} contacts created.`);
      console.log(`   ✅ ${opportunitiesCreated} opportunities created.`);
      console.log('   ✅ Tags, notes, tasks, and custom fields migrated.\n');
    }
  }

  // ========================================================================
  // PHASE 4: Create useful indexes
  // ========================================================================
  console.log('=== PHASE 4: Creating indexes ===\n');

  const indexes = [
    { name: 'idx_contacts_phone', sql: 'CREATE INDEX idx_contacts_phone ON contacts(phone)' },
    { name: 'idx_contacts_email', sql: 'CREATE INDEX idx_contacts_email ON contacts(email)' },
    { name: 'idx_opp_contact', sql: 'CREATE INDEX idx_opp_contact ON opportunities(contactId)' },
    { name: 'idx_opp_pipeline', sql: 'CREATE INDEX idx_opp_pipeline ON opportunities(pipelineId)' },
    { name: 'idx_opp_stage', sql: 'CREATE INDEX idx_opp_stage ON opportunities(stageId)' },
    { name: 'idx_opp_status', sql: 'CREATE INDEX idx_opp_status ON opportunities(status)' },
    { name: 'idx_ct_contact', sql: 'CREATE INDEX idx_ct_contact ON contact_tags(contactId)' },
    { name: 'idx_ct_tag', sql: 'CREATE INDEX idx_ct_tag ON contact_tags(tagId)' },
  ];

  for (const idx of indexes) {
    try {
      await connection.execute(idx.sql);
      console.log(`   ✅ ${idx.name} created.`);
    } catch (e: any) {
      if (e.code === 'ER_DUP_KEYNAME') {
        console.log(`   ⏭️  ${idx.name} already exists.`);
      } else {
        console.log(`   ⚠️  ${idx.name} failed: ${e.message}`);
      }
    }
  }

  console.log('\n=== ✅ Sprint 3 Migration Complete! ===\n');
  console.log('Summary:');
  console.log('  - 7 new tables created');
  console.log('  - Default pipeline seeded with 8 stages');
  console.log('  - Existing leads migrated to contacts + opportunities');
  console.log('  - Tags, notes, tasks, and custom fields migrated');
  console.log('\nNOTE: The old "leads" table was NOT deleted. It is kept as backup.');
  console.log('You can drop it manually after verifying the migration.\n');

  await connection.end();
}

migrate().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
