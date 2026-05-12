import { eq, or, like, desc, sql, and, isNull, isNotNull, gte, lte, count as drizzleCount, sum, inArray, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, passwordResetTokens, InsertPasswordResetToken, PasswordResetToken, tags, Tag, InsertTag, contactTags, ContactTag, customFieldDefinitions, customFieldValues, CustomFieldDefinition, InsertCustomFieldDefinition, CustomFieldValue, InsertCustomFieldValue, contacts, Contact, InsertContact, InsertContactTag, pipelines, Pipeline, InsertPipeline, pipelineStages, PipelineStage, InsertPipelineStage, opportunities, Opportunity, InsertOpportunity, opportunityNotes, OpportunityNote, InsertOpportunityNote, opportunityTasks, OpportunityTask, InsertOpportunityTask } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
const ENABLE_PERF_LOGS = process.env.ENABLE_PERF_LOGS === "true";

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
      email: user.email || `oauth-${user.openId}@manus.local`,
      username: user.email || `oauth-${user.openId}@manus.local`,
      passwordHash: 'oauth-not-used',
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? undefined;
      values[field] = normalized as any;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}


// ===================== DASHBOARD (Opportunities-based) =====================

export async function getDashboardStats(pipelineId?: number, dataInicial?: Date, dataFinal?: Date) {
  const start = Date.now();
  const db = await getDb();
  if (!db) return null;

  const whereFor = (...conditions: any[]) => {
    const active = conditions.filter(Boolean);
    return active.length > 0 ? and(...active) : undefined;
  };
  const pipelineCondition = pipelineId ? eq(opportunities.pipelineId, pipelineId) : undefined;
  const createdPeriodFilter = whereFor(
    pipelineCondition,
    dataInicial ? gte(opportunities.createdAt, dataInicial) : undefined,
    dataFinal ? lte(opportunities.createdAt, dataFinal) : undefined
  );
  const openFilter = whereFor(createdPeriodFilter, eq(opportunities.status, "open"));
  const wonFilter = whereFor(
    pipelineCondition,
    eq(opportunities.status, "won"),
    dataInicial ? gte(opportunities.wonAt, dataInicial) : undefined,
    dataFinal ? lte(opportunities.wonAt, dataFinal) : undefined
  );
  const lostFilter = whereFor(
    pipelineCondition,
    eq(opportunities.status, "lost"),
    dataInicial ? gte(opportunities.lostAt, dataInicial) : undefined,
    dataFinal ? lte(opportunities.lostAt, dataFinal) : undefined
  );
  const abandonedFilter = whereFor(
    pipelineCondition,
    eq(opportunities.status, "abandoned"),
    dataInicial ? gte(opportunities.lostAt, dataInicial) : undefined,
    dataFinal ? lte(opportunities.lostAt, dataFinal) : undefined
  );

  const [createdRes] = await db.select({ c: drizzleCount() }).from(opportunities).where(createdPeriodFilter);
  const totalCreatedOpportunities = createdRes?.c || 0;

  const [openRes] = await db.select({ c: drizzleCount(), totalVal: sum(opportunities.monetaryValue) })
    .from(opportunities)
    .where(openFilter);
  const openOpportunities = openRes?.c || 0;
  const openValue = parseFloat(String(openRes?.totalVal || 0));

  const [wonRes] = await db.select({ c: drizzleCount(), totalVal: sum(opportunities.monetaryValue) })
    .from(opportunities)
    .where(wonFilter);
  const wonOpportunities = wonRes?.c || 0;
  const wonValue = parseFloat(String(wonRes?.totalVal || 0));

  const [lostRes] = await db.select({ c: drizzleCount() })
    .from(opportunities)
    .where(lostFilter);
  const lostOpportunities = lostRes?.c || 0;

  const [abandonedRes] = await db.select({ c: drizzleCount() })
    .from(opportunities)
    .where(abandonedFilter);
  const abandonedOpportunities = abandonedRes?.c || 0;

  const closedOpportunities = wonOpportunities + lostOpportunities + abandonedOpportunities;
  const conversionRate = closedOpportunities > 0 ? (wonOpportunities / closedOpportunities) * 100 : 0;
  const lossRate = closedOpportunities > 0 ? (lostOpportunities / closedOpportunities) * 100 : 0;
  const abandonmentRate = closedOpportunities > 0 ? (abandonedOpportunities / closedOpportunities) * 100 : 0;
  const dropoutRate = closedOpportunities > 0 ? ((lostOpportunities + abandonedOpportunities) / closedOpportunities) * 100 : 0;

  const dinheiroNaMesa = {
    implementacao: openValue,
    recorrencia: 0,
  };

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const createdMonthlyFilter = whereFor(
    pipelineCondition,
    dataInicial ? gte(opportunities.createdAt, dataInicial) : gte(opportunities.createdAt, sixMonthsAgo),
    dataFinal ? lte(opportunities.createdAt, dataFinal) : undefined
  );
  const monthlyRes = await db.select({
    month: sql<string>`DATE_FORMAT(${opportunities.createdAt}, '%Y-%m')`,
    c: drizzleCount(),
  }).from(opportunities).where(createdMonthlyFilter)
    .groupBy(sql`DATE_FORMAT(${opportunities.createdAt}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${opportunities.createdAt}, '%Y-%m')`);
  const opportunitiesCreatedByMonth = monthlyRes.map((r: any) => ({ month: r.month, count: r.c }));

  const closedDateExpr = sql`COALESCE(${opportunities.wonAt}, ${opportunities.lostAt})`;
  const closedMonthlyFilter = whereFor(
    pipelineCondition,
    inArray(opportunities.status, ["won", "lost", "abandoned"]),
    dataInicial ? sql`${closedDateExpr} >= ${dataInicial}` : sql`${closedDateExpr} >= ${sixMonthsAgo}`,
    dataFinal ? sql`${closedDateExpr} <= ${dataFinal}` : undefined
  );
  const closedMonthlyRes = await db.select({
    month: sql<string>`DATE_FORMAT(${closedDateExpr}, '%Y-%m')`,
    c: drizzleCount(),
  }).from(opportunities).where(closedMonthlyFilter)
    .groupBy(sql`DATE_FORMAT(${closedDateExpr}, '%Y-%m')`)
    .orderBy(sql`DATE_FORMAT(${closedDateExpr}, '%Y-%m')`);
  const opportunitiesClosedByMonth = closedMonthlyRes.map((r: any) => ({ month: r.month, count: r.c }));

  const segRes = await db.select({ segment: opportunities.segment, c: drizzleCount() })
    .from(opportunities).where(createdPeriodFilter).groupBy(opportunities.segment);
  const opportunitiesBySegment: Record<string, number> = {};
  segRes.forEach((r: any) => { if (r.segment) opportunitiesBySegment[r.segment] = r.c; });

  // "Frios" = open opps created > 7 days ago (no contact field, use createdAt proxy)
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [friosRes] = await db.select({ c: drizzleCount() }).from(opportunities).where(
    whereFor(openFilter, lte(opportunities.createdAt, cutoff))
  );
  const coldOpportunities = friosRes?.c || 0;

  // Active funnel by stage: only open opportunities in active operational stages.
  const stageRes = await db.select({ stageName: pipelineStages.name, c: drizzleCount() })
    .from(opportunities)
    .innerJoin(pipelineStages, eq(opportunities.stageId, pipelineStages.id))
    .where(whereFor(openFilter, or(eq(pipelineStages.isActiveInFunnel, true), isNull(pipelineStages.isActiveInFunnel))))
    .groupBy(pipelineStages.id, pipelineStages.name, pipelineStages.displayOrder)
    .orderBy(asc(pipelineStages.displayOrder));
  const opportunitiesByStage: Record<string, number> = {};
  stageRes.forEach((r: any) => { opportunitiesByStage[r.stageName] = r.c; });

  const opportunitiesByStatus: Record<string, number> = {
    open: openOpportunities,
    won: wonOpportunities,
    lost: lostOpportunities,
    abandoned: abandonedOpportunities,
  };

  const result = {
    openOpportunities,
    wonOpportunities,
    lostOpportunities,
    abandonedOpportunities,
    closedOpportunities,
    totalCreatedOpportunities,
    openValue,
    wonValue,
    conversionRate: Number(conversionRate.toFixed(1)),
    lossRate: Number(lossRate.toFixed(1)),
    abandonmentRate: Number(abandonmentRate.toFixed(1)),
    dropoutRate: Number(dropoutRate.toFixed(1)),
    opportunitiesByStatus,
    opportunitiesByStage,
    opportunitiesCreatedByMonth,
    opportunitiesClosedByMonth,
    dinheiroNaMesa,
    valorTotalGanho: wonValue,
    tempoMedioFunil: 0,
    opportunitiesBySegment,
    opportunitiesByMonth: opportunitiesCreatedByMonth,
    coldOpportunities,
    totalOpportunities: totalCreatedOpportunities,
    taxaConversao: Number(conversionRate.toFixed(1)),
    taxaDropout: Number(dropoutRate.toFixed(1)),
  };
  if (ENABLE_PERF_LOGS) {
    console.log("[PERF] getDashboardStats", { elapsedMs: Date.now() - start });
  }
  return result;
}

export async function getFollowUpAlerts(daysSinceContact: number = 7) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - daysSinceContact * 24 * 60 * 60 * 1000);
  const results = await db.select({
    id: opportunities.id,
    companyName: contacts.company,
    contactName: contacts.name,
    status: opportunities.status,
    lastContactAt: opportunities.createdAt,
  }).from(opportunities)
    .innerJoin(contacts, eq(opportunities.contactId, contacts.id))
    .where(and(eq(opportunities.status, "open"), lte(opportunities.createdAt, cutoff)))
    .orderBy(opportunities.createdAt);
  return results;
}

// ===================== TAGS =====================

export async function getAllTags(): Promise<Tag[]> {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tags).orderBy(tags.name);
}

export async function createTag(tag: InsertTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tags).values(tag);
  const insertedId = (result as any).insertId;
  if (insertedId) {
    const created = await db.select().from(tags).where(eq(tags.id, insertedId as number)).limit(1);
    return created[0];
  }
  return result;
}

export async function updateTag(id: number, updates: Partial<InsertTag>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(tags).set(updates).where(eq(tags.id, id));
}

export async function deleteTag(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(contactTags).where(eq(contactTags.tagId, id));
  return db.delete(tags).where(eq(tags.id, id));
}





/**
 * Register a new user with username and password
 */
export async function registerUser(username: string, email: string, passwordHash: string): Promise<InsertUser | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const result = await db.insert(users).values({
      username,
      email,
      passwordHash,
      loginMethod: "local",
      role: "user",
      lastSignedIn: new Date(),
    });

    // drizzle/mysql2 typically returns an OkPacket-like object (not an array).
    // Handle both shapes defensively.
    const userId = (result as any)?.insertId ?? (Array.isArray(result) ? (result as any)[0]?.insertId : undefined);
    if (!userId) return null;

    const user = await db.select().from(users).where(eq(users.id, userId as number)).limit(1);
    return user[0] || null;
  } catch (error) {
    console.error("Error registering user:", error);
    console.error("Error details:", {
      message: (error as any)?.message,
      code: (error as any)?.code,
      errno: (error as any)?.errno,
      sqlState: (error as any)?.sqlState,
      sqlMessage: (error as any)?.sqlMessage,
    });
    // Re-throw para que a mutation possa capturar o erro real
    throw error;
  }
}

/**
 * Get user by username
 */
export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
  return result[0] || null;
}

/**
 * Update last signed in
 */
export async function updateLastSignedIn(userId: number) {
  const db = await getDb();
  if (!db) return;

  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}


/**
 * Get user by ID
 */
export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}


/**
 * Get user by email
 */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result[0] || null;
}

/**
 * Create password reset token
 */
export async function createPasswordResetToken(userId: number, token: string, expiresInHours: number = 24): Promise<PasswordResetToken | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    const expiresAt = new Date(Date.now() + expiresInHours * 60 * 60 * 1000);
    const result = await db.insert(passwordResetTokens).values({
      userId,
      token,
      expiresAt,
    });

    // drizzle/mysql2 typically returns an OkPacket-like object (not an array).
    const tokenId = (result as any)?.insertId ?? (Array.isArray(result) ? (result as any)[0]?.insertId : undefined);
    if (!tokenId) return null;

    const resetToken = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.id, tokenId as number)).limit(1);
    return resetToken[0] || null;
  } catch (error) {
    console.error("Error creating password reset token:", error);
    return null;
  }
}

/**
 * Get valid password reset token
 */
export async function getValidPasswordResetToken(token: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(passwordResetTokens).where(
    and(
      eq(passwordResetTokens.token, token),
      isNull(passwordResetTokens.used)
    )
  ).limit(1);

  const resetToken = result[0];
  if (!resetToken) return null;

  if (resetToken.expiresAt < new Date()) {
    return null;
  }

  return resetToken;
}

/**
 * Mark password reset token as used
 */
export async function markPasswordResetTokenAsUsed(tokenId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(passwordResetTokens).set({ used: new Date() }).where(eq(passwordResetTokens.id, tokenId));
}

/**
 * Update user password
 */
export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}





// ===================== CUSTOM FIELDS =====================

/**
 * Get all custom field definitions, optionally filtered by model
 */
export async function getCustomFieldDefinitions(model?: string): Promise<CustomFieldDefinition[]> {
  const db = await getDb();
  if (!db) return [];

  let query: any = db.select().from(customFieldDefinitions);
  if (model) {
    query = query.where(eq(customFieldDefinitions.model, model));
  }
  return query.orderBy(customFieldDefinitions.displayOrder);
}

/**
 * Get a single custom field definition by ID
 */
export async function getCustomFieldDefinitionById(id: number): Promise<CustomFieldDefinition | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(customFieldDefinitions).where(eq(customFieldDefinitions.id, id)).limit(1);
  return result[0];
}

/**
 * Create a new custom field definition
 */
export async function createCustomFieldDefinition(definition: InsertCustomFieldDefinition) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Auto-assign next displayOrder if not provided
  if (definition.displayOrder === undefined || definition.displayOrder === 0) {
    const maxOrder = await db.select({ max: sql<number>`COALESCE(MAX(displayOrder), 0)` }).from(customFieldDefinitions);
    definition.displayOrder = (maxOrder[0]?.max || 0) + 1;
  }

  const result = await db.insert(customFieldDefinitions).values(definition);
  const insertedId = (result as any).insertId;
  if (insertedId) {
    return getCustomFieldDefinitionById(insertedId);
  }
  return result;
}

/**
 * Update a custom field definition
 */
export async function updateCustomFieldDefinition(id: number, updates: Partial<InsertCustomFieldDefinition>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(customFieldDefinitions).set(updates).where(eq(customFieldDefinitions.id, id));
}

/**
 * Delete a custom field definition and all its values
 */
export async function deleteCustomFieldDefinition(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Delete all values for this definition first
  await db.delete(customFieldValues).where(eq(customFieldValues.definitionId, id));
  // Then delete the definition itself
  return db.delete(customFieldDefinitions).where(eq(customFieldDefinitions.id, id));
}

/**
 * Reorder custom field definitions
 */
export async function reorderCustomFieldDefinitions(orderedIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (let i = 0; i < orderedIds.length; i++) {
    await db.update(customFieldDefinitions)
      .set({ displayOrder: i })
      .where(eq(customFieldDefinitions.id, orderedIds[i]));
  }
}

/**
 * Get all custom field values for a specific entity
 */
export async function getCustomFieldValues(entityId: number, entityType: string = "contact"): Promise<CustomFieldValue[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(customFieldValues)
    .where(and(
      eq(customFieldValues.entityId, entityId),
      eq(customFieldValues.entityType, entityType)
    ));
}

/**
 * Set (upsert) custom field values for an entity in bulk.
 * Takes an array of { definitionId, value } objects.
 */
export async function setCustomFieldValues(
  entityId: number,
  entityType: string,
  values: Array<{ definitionId: number; value: string | null }>
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (const { definitionId, value } of values) {
    // Check if a value already exists for this entity + definition
    const existing = await db.select({ id: customFieldValues.id })
      .from(customFieldValues)
      .where(and(
        eq(customFieldValues.entityId, entityId),
        eq(customFieldValues.entityType, entityType),
        eq(customFieldValues.definitionId, definitionId)
      ))
      .limit(1);

    if (existing.length > 0) {
      // Update existing value
      await db.update(customFieldValues)
        .set({ value })
        .where(eq(customFieldValues.id, existing[0].id));
    } else if (value !== null && value !== "") {
      // Insert new value (skip if empty/null to save space)
      await db.insert(customFieldValues).values({
        definitionId,
        entityId,
        entityType,
        value,
      });
    }
  }
}

/**
 * Delete all custom field values for a specific entity
 */
export async function deleteCustomFieldValuesForEntity(entityId: number, entityType: string = "contact") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(customFieldValues)
    .where(and(
      eq(customFieldValues.entityId, entityId),
      eq(customFieldValues.entityType, entityType)
    ));
}

// ===================== SPRINT 3: CONTACTS =====================

export async function getContacts(filters?: {
  search?: string;
  city?: string;
  segment?: string;
  tagIds?: number[];
}) {
  const start = Date.now();
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  if (filters?.search) {
    const s = `%${filters.search}%`;
    conditions.push(or(
      like(contacts.name, s),
      like(contacts.company, s),
      like(contacts.phone, s),
      like(contacts.email, s),
    ));
  }
  if (filters?.city) conditions.push(eq(contacts.city, filters.city));
  if (filters?.segment) conditions.push(eq(contacts.segment, filters.segment));

  let results = await db.select().from(contacts)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contacts.createdAt));

  // Filter by tags if provided
  if (filters?.tagIds && filters.tagIds.length > 0) {
    const requestedTagIds = Array.from(new Set(filters.tagIds));
    const tagRows = await db.select({
      contactId: contactTags.contactId,
      tagId: contactTags.tagId,
    })
      .from(contactTags)
      .where(inArray(contactTags.tagId, requestedTagIds));

    const tagIdsByContactId = new Map<number, Set<number>>();
    for (const row of tagRows) {
      const existing = tagIdsByContactId.get(row.contactId) || new Set<number>();
      existing.add(row.tagId);
      tagIdsByContactId.set(row.contactId, existing);
    }

    results = results.filter(contact => {
      const contactTagIds = tagIdsByContactId.get(contact.id);
      return !!contactTagIds && requestedTagIds.every(tagId => contactTagIds.has(tagId));
    });
  }

  // Attach tags for each contact
  const contactIds = results.map(contact => contact.id);
  const tagsByContactId = new Map<number, Array<{ id: number; name: string; color: string }>>();

  if (contactIds.length > 0) {
    const allTagRows = await db.select({
      contactId: contactTags.contactId,
      id: tags.id,
      name: tags.name,
      color: tags.color,
    }).from(contactTags)
      .innerJoin(tags, eq(contactTags.tagId, tags.id))
      .where(inArray(contactTags.contactId, contactIds));

    for (const row of allTagRows) {
      const existing = tagsByContactId.get(row.contactId) || [];
      existing.push({ id: row.id, name: row.name, color: row.color });
      tagsByContactId.set(row.contactId, existing);
    }
  }

  const enriched = results.map(contact => ({
    ...contact,
    tags: tagsByContactId.get(contact.id) || [],
  }));

  if (ENABLE_PERF_LOGS) {
    console.log("[PERF] getContacts", { count: enriched.length, elapsedMs: Date.now() - start });
  }
  return enriched;
}

export async function getContactById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
  if (!contact) return null;

  const tagRows = await db.select({
    id: tags.id,
    name: tags.name,
    color: tags.color,
  }).from(contactTags)
    .innerJoin(tags, eq(contactTags.tagId, tags.id))
    .where(eq(contactTags.contactId, id));

  // Get opportunity count
  const [oppCount] = await db.select({ count: drizzleCount() })
    .from(opportunities)
    .where(eq(opportunities.contactId, id));

  return { ...contact, tags: tagRows, opportunityCount: oppCount?.count || 0 };
}

export async function createContact(data: InsertContact & { tagIds?: number[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { tagIds, ...contactData } = data;
  const [result] = await db.insert(contacts).values(contactData).$returningId();

  if (tagIds && tagIds.length > 0) {
    for (const tagId of tagIds) {
      await db.insert(contactTags).values({ contactId: result.id, tagId });
    }
  }

  return { id: result.id };
}

export async function updateContact(id: number, data: Partial<InsertContact> & { tagIds?: number[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { tagIds, ...contactData } = data;

  if (Object.keys(contactData).length > 0) {
    await db.update(contacts).set(contactData).where(eq(contacts.id, id));
  }

  if (tagIds !== undefined) {
    await db.delete(contactTags).where(eq(contactTags.contactId, id));
    for (const tagId of tagIds) {
      await db.insert(contactTags).values({ contactId: id, tagId });
    }
  }
}

export async function deleteContact(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // ── Hardening: bloquear exclusão se contato possui oportunidades ──
  const linkedOpps = await db.select({ id: opportunities.id }).from(opportunities).where(eq(opportunities.contactId, id));
  if (linkedOpps.length > 0) {
    throw new Error(
      `Não é possível excluir este contato porque ele possui ${linkedOpps.length} oportunidade(s) vinculada(s). Exclua ou transfira as oportunidades antes de remover o contato.`
    );
  }

  // Sem oportunidades: exclusão segura de vínculos auxiliares e contato
  await db.delete(contactTags).where(eq(contactTags.contactId, id));
  await db.delete(contacts).where(eq(contacts.id, id));
}

export async function getUniqueContactCities() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.selectDistinct({ city: contacts.city }).from(contacts)
    .where(isNotNull(contacts.city));
  return rows.map(r => r.city).filter(Boolean) as string[];
}

export async function getUniqueContactSegments() {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.selectDistinct({ segment: contacts.segment }).from(contacts)
    .where(isNotNull(contacts.segment));
  return rows.map(r => r.segment).filter(Boolean) as string[];
}

// ===================== SPRINT 3: PIPELINES =====================

export async function getAllPipelines() {
  const db = await getDb();
  if (!db) return [];

  const pipelineList = await db.select().from(pipelines).orderBy(pipelines.createdAt);

  const enriched = [];
  for (const p of pipelineList) {
    const stageList = await db.select().from(pipelineStages)
      .where(eq(pipelineStages.pipelineId, p.id))
      .orderBy(pipelineStages.displayOrder);
    enriched.push({ ...p, stages: stageList });
  }

  return enriched;
}

export async function getPipelineById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, id));
  if (!pipeline) return null;

  const stageList = await db.select().from(pipelineStages)
    .where(eq(pipelineStages.pipelineId, id))
    .orderBy(pipelineStages.displayOrder);

  return { ...pipeline, stages: stageList };
}

export async function createPipeline(data: { name: string; stages: { name: string; color?: string; isFinal?: boolean; finalType?: string | null }[] }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(pipelines).values({ name: data.name }).$returningId();

  for (let i = 0; i < data.stages.length; i++) {
    const stage = data.stages[i];
    await db.insert(pipelineStages).values({
      pipelineId: result.id,
      name: stage.name,
      color: stage.color || null,
      displayOrder: i,
      isFinal: stage.isFinal || false,
      finalType: stage.finalType || null,
    });
  }

  return { id: result.id };
}

export async function updatePipeline(id: number, data: { name?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (data.name) {
    await db.update(pipelines).set({ name: data.name }).where(eq(pipelines.id, id));
  }
}

export async function deletePipeline(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if it's the default pipeline
  const [p] = await db.select().from(pipelines).where(eq(pipelines.id, id));
  if (p?.isDefault) throw new Error("Não é possível deletar o pipeline padrão");

  // Move opportunities to default pipeline? Or block if has opportunities?
  const [oppCount] = await db.select({ count: drizzleCount() })
    .from(opportunities).where(eq(opportunities.pipelineId, id));
  if (oppCount && oppCount.count > 0) {
    throw new Error(`Este pipeline possui ${oppCount.count} oportunidades. Mova-as antes de deletar.`);
  }

  await db.delete(pipelineStages).where(eq(pipelineStages.pipelineId, id));
  await db.delete(pipelines).where(eq(pipelines.id, id));
}

// ===================== SPRINT 3: PIPELINE STAGES =====================

export async function createPipelineStage(data: InsertPipelineStage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(pipelineStages).values(data).$returningId();
  return { id: result.id };
}

export async function updatePipelineStage(id: number, data: Partial<InsertPipelineStage>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(pipelineStages).set(data).where(eq(pipelineStages.id, id));
}

export async function deletePipelineStage(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if any opportunities are in this stage
  const [oppCount] = await db.select({ count: drizzleCount() })
    .from(opportunities).where(eq(opportunities.stageId, id));
  if (oppCount && oppCount.count > 0) {
    throw new Error(`Este estágio possui ${oppCount.count} oportunidades. Mova-as antes de deletar.`);
  }

  await db.delete(pipelineStages).where(eq(pipelineStages.id, id));
}

export async function reorderPipelineStages(pipelineId: number, stageIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (let i = 0; i < stageIds.length; i++) {
    await db.update(pipelineStages)
      .set({ displayOrder: i })
      .where(and(eq(pipelineStages.id, stageIds[i]), eq(pipelineStages.pipelineId, pipelineId)));
  }
}

// ===================== SPRINT 3: OPPORTUNITIES =====================

export async function getOpportunities(filters?: {
  pipelineId?: number;
  stageId?: number;
  contactId?: number;
  status?: string;
  search?: string;
}) {
  const start = Date.now();
  const db = await getDb();
  if (!db) return [];

  const conditions: any[] = [];

  if (filters?.pipelineId) conditions.push(eq(opportunities.pipelineId, filters.pipelineId));
  if (filters?.stageId) conditions.push(eq(opportunities.stageId, filters.stageId));
  if (filters?.contactId) conditions.push(eq(opportunities.contactId, filters.contactId));
  if (filters?.status) conditions.push(eq(opportunities.status, filters.status));
  if (filters?.search) {
    const s = `%${filters.search}%`;
    conditions.push(like(opportunities.title, s));
  }

  const results = await db.select({
    id: opportunities.id,
    contactId: opportunities.contactId,
    pipelineId: opportunities.pipelineId,
    stageId: opportunities.stageId,
    title: opportunities.title,
    monetaryValue: opportunities.monetaryValue,
    status: opportunities.status,
    segment: opportunities.segment,
    source: opportunities.source,
    notes: opportunities.notes,
    wonAt: opportunities.wonAt,
    lostAt: opportunities.lostAt,
    lostReason: opportunities.lostReason,
    createdAt: opportunities.createdAt,
    updatedAt: opportunities.updatedAt,
    contactName: contacts.name,
    contactCompany: contacts.company,
    contactPhone: contacts.phone,
    contactEmail: contacts.email,
    stageName: pipelineStages.name,
    stageColor: pipelineStages.color,
  }).from(opportunities)
    .innerJoin(contacts, eq(opportunities.contactId, contacts.id))
    .innerJoin(pipelineStages, eq(opportunities.stageId, pipelineStages.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(opportunities.createdAt));

  const enriched = results.map(opp => ({
    ...opp,
    contactName: opp.contactName || "Desconhecido",
    contactCompany: opp.contactCompany || "",
    contactPhone: opp.contactPhone || "",
    contactEmail: opp.contactEmail || "",
    stageName: opp.stageName || "",
    stageColor: opp.stageColor || "",
  }));

  if (ENABLE_PERF_LOGS) {
    console.log("[PERF] getOpportunities", { count: enriched.length, elapsedMs: Date.now() - start });
  }
  return enriched;
}

export async function getOpportunityById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const [opp] = await db.select().from(opportunities).where(eq(opportunities.id, id));
  if (!opp) return null;

  const [contact] = await db.select().from(contacts).where(eq(contacts.id, opp.contactId));
  const [stage] = await db.select().from(pipelineStages).where(eq(pipelineStages.id, opp.stageId));
  const [pipeline] = await db.select().from(pipelines).where(eq(pipelines.id, opp.pipelineId));

  const notes = await db.select().from(opportunityNotes)
    .where(eq(opportunityNotes.opportunityId, id))
    .orderBy(desc(opportunityNotes.createdAt));

  const taskList = await db.select().from(opportunityTasks)
    .where(eq(opportunityTasks.opportunityId, id))
    .orderBy(opportunityTasks.dueDate);

  return {
    ...opp,
    contact: contact || null,
    stage: stage || null,
    pipeline: pipeline || null,
    notes,
    tasks: taskList,
  };
}

export async function createOpportunity(data: InsertOpportunity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(opportunities).values(data);
  const insertedId = (result as any)[0]?.insertId ?? (result as any).insertId;
  return { id: insertedId };
}

export async function updateOpportunity(id: number, data: Partial<InsertOpportunity>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.update(opportunities).set(data).where(eq(opportunities.id, id));
  const affectedRows =
    (result as any)?.affectedRows ??
    (Array.isArray(result) ? (result as any)[0]?.affectedRows : undefined);
  if (affectedRows !== undefined && affectedRows === 0) {
    throw new Error("Oportunidade nao encontrada para atualizacao.");
  }

  const updated = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
  return updated[0] || null;
}

export async function deleteOpportunity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(opportunityNotes).where(eq(opportunityNotes.opportunityId, id));
  await db.delete(opportunityTasks).where(eq(opportunityTasks.opportunityId, id));
  await db.delete(opportunities).where(eq(opportunities.id, id));
}

export async function moveOpportunityToStage(id: number, stageId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if stage is final
  const [stage] = await db.select().from(pipelineStages).where(eq(pipelineStages.id, stageId));

  const updateData: any = { stageId };

  if (stage?.isFinal) {
    if (stage.finalType === 'ganho') {
      updateData.status = 'won';
      updateData.wonAt = new Date();
    } else if (stage.finalType === 'perdido') {
      updateData.status = 'lost';
      updateData.lostAt = new Date();
    } else if (stage.finalType === 'abandonado') {
      updateData.status = 'abandoned';
      updateData.lostAt = new Date();
    }
  } else {
    updateData.status = 'open';
    updateData.wonAt = null;
    updateData.lostAt = null;
  }

  await db.update(opportunities).set(updateData).where(eq(opportunities.id, id));
}

export async function setOpportunityOutcome(
  id: number,
  outcome: "won" | "lost" | "abandoned",
  reason: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select({ id: opportunities.id }).from(opportunities).where(eq(opportunities.id, id)).limit(1);
  if (existing.length === 0) {
    throw new Error("Oportunidade nao encontrada.");
  }

  const normalizedReason = reason.trim();
  if (!normalizedReason) {
    throw new Error("Justificativa obrigatoria.");
  }

  const updateData: Partial<InsertOpportunity> = {
    status: outcome,
  };

  if (outcome === "won") {
    updateData.wonAt = new Date();
    updateData.lostAt = null;
    updateData.lostReason = null;
  } else {
    updateData.wonAt = null;
    updateData.lostAt = new Date();
    updateData.lostReason = normalizedReason;
  }

  await db.update(opportunities).set(updateData).where(eq(opportunities.id, id));

  if (outcome === "won") {
    try {
      await db.insert(opportunityNotes).values({
        opportunityId: id,
        noteType: "outcome",
        content: `Desfecho registrado como Ganho. Justificativa: ${normalizedReason}`,
      });
    } catch (noteError) {
      // A nota automática é complementar; não deve impedir o desfecho comercial.
      console.warn("[setOutcome] could not persist won note", noteError);
    }
  }

  const updated = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
  return updated[0] || null;
}

export async function getClosedOpportunities(filters?: {
  pipelineId?: number;
  status?: "won" | "lost" | "abandoned";
  search?: string;
}) {
  const db = await getDb();
  if (!db) return [];

  const closedStatuses: Array<"won" | "lost" | "abandoned"> = ["won", "lost", "abandoned"];
  const conditions: any[] = [inArray(opportunities.status, closedStatuses)];

  if (filters?.pipelineId) conditions.push(eq(opportunities.pipelineId, filters.pipelineId));
  if (filters?.status) conditions.push(eq(opportunities.status, filters.status));
  if (filters?.search && filters.search.trim() !== "") {
    const s = `%${filters.search.trim()}%`;
    conditions.push(
      or(
        like(opportunities.title, s),
        like(contacts.name, s),
        like(contacts.company, s)
      )
    );
  }

  const rows = await db.select({
    id: opportunities.id,
    title: opportunities.title,
    contactId: opportunities.contactId,
    pipelineId: opportunities.pipelineId,
    stageId: opportunities.stageId,
    monetaryValue: opportunities.monetaryValue,
    status: opportunities.status,
    source: opportunities.source,
    notes: opportunities.notes,
    wonAt: opportunities.wonAt,
    lostAt: opportunities.lostAt,
    lostReason: opportunities.lostReason,
    createdAt: opportunities.createdAt,
    updatedAt: opportunities.updatedAt,
    contactName: contacts.name,
    contactCompany: contacts.company,
    contactPhone: contacts.phone,
    contactEmail: contacts.email,
    stageName: pipelineStages.name,
    stageColor: pipelineStages.color,
    pipelineName: pipelines.name,
  })
    .from(opportunities)
    .innerJoin(contacts, eq(opportunities.contactId, contacts.id))
    .innerJoin(pipelineStages, eq(opportunities.stageId, pipelineStages.id))
    .innerJoin(pipelines, eq(opportunities.pipelineId, pipelines.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(sql`COALESCE(${opportunities.wonAt}, ${opportunities.lostAt}, ${opportunities.updatedAt})`));

  const wonOpportunityIds = rows
    .filter((row: any) => row.status === "won")
    .map((row: any) => row.id);

  const outcomeNotesByOpportunityId = new Map<number, string>();
  if (wonOpportunityIds.length > 0) {
    const wonOutcomeNotes = await db.select({
      opportunityId: opportunityNotes.opportunityId,
      content: opportunityNotes.content,
      createdAt: opportunityNotes.createdAt,
    })
      .from(opportunityNotes)
      .where(and(
        inArray(opportunityNotes.opportunityId, wonOpportunityIds),
        eq(opportunityNotes.noteType, "outcome")
      ))
      .orderBy(desc(opportunityNotes.createdAt));

    for (const note of wonOutcomeNotes) {
      if (!outcomeNotesByOpportunityId.has(note.opportunityId)) {
        const prefix = "Justificativa:";
        const index = note.content.indexOf(prefix);
        const extracted = index >= 0
          ? note.content.slice(index + prefix.length).trim()
          : note.content.trim();
        outcomeNotesByOpportunityId.set(note.opportunityId, extracted);
      }
    }
  }

  return rows.map((row: any) => ({
    ...row,
    outcomeReason:
      row.status === "won"
        ? (outcomeNotesByOpportunityId.get(row.id) || null)
        : (row.lostReason || null),
  }));
}

export async function reopenOpportunity(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
  if (existing.length === 0) {
    throw new Error("Oportunidade nao encontrada.");
  }

  const opportunity = existing[0];
  let nextStageId = opportunity.stageId;

  if (!nextStageId) {
    const activeStages = await db.select({
      id: pipelineStages.id,
    })
      .from(pipelineStages)
      .where(and(
        eq(pipelineStages.pipelineId, opportunity.pipelineId),
        eq(pipelineStages.isActiveInFunnel, true)
      ))
      .orderBy(asc(pipelineStages.displayOrder))
      .limit(1);

    if (activeStages.length === 0) {
      throw new Error("Nao foi possivel reabrir: oportunidade sem estagio valido e sem estagio ativo no pipeline.");
    }
    nextStageId = activeStages[0].id;
  }

  await db.update(opportunities).set({
    status: "open",
    wonAt: null,
    lostAt: null,
    lostReason: null,
    stageId: nextStageId,
    updatedAt: new Date(),
  }).where(eq(opportunities.id, id));

  const updated = await db.select().from(opportunities).where(eq(opportunities.id, id)).limit(1);
  return updated[0] || null;
}

// ===================== SPRINT 3: OPPORTUNITY NOTES =====================

export async function getOpportunityNotes(opportunityId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(opportunityNotes)
    .where(eq(opportunityNotes.opportunityId, opportunityId))
    .orderBy(desc(opportunityNotes.createdAt));
}

export async function createOpportunityNote(data: InsertOpportunityNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(opportunityNotes).values(data).$returningId();
  return { id: result.id };
}

export async function deleteOpportunityNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(opportunityNotes).where(eq(opportunityNotes.id, id));
}

// ===================== SPRINT 3: OPPORTUNITY TASKS =====================

export async function getOpportunityTasks(opportunityId: number) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(opportunityTasks)
    .where(eq(opportunityTasks.opportunityId, opportunityId))
    .orderBy(opportunityTasks.dueDate);
}

export async function createOpportunityTask(data: InsertOpportunityTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(opportunityTasks).values(data).$returningId();
  return { id: result.id };
}

export async function completeOpportunityTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(opportunityTasks).set({ completedAt: new Date() }).where(eq(opportunityTasks.id, id));
}

export async function deleteOpportunityTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(opportunityTasks).where(eq(opportunityTasks.id, id));
}

// ===================== SPRINT 3: DASHBOARD STATS =====================

export async function getOpportunityStats(pipelineId?: number) {
  const db = await getDb();
  if (!db) return { total: 0, open: 0, won: 0, lost: 0, abandoned: 0, totalValue: 0, wonValue: 0 };

  const conditions: any[] = [];
  if (pipelineId) conditions.push(eq(opportunities.pipelineId, pipelineId));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [total] = await db.select({ count: drizzleCount() }).from(opportunities).where(whereClause);
  const [open] = await db.select({ count: drizzleCount() }).from(opportunities)
    .where(whereClause ? and(whereClause, eq(opportunities.status, 'open')) : eq(opportunities.status, 'open'));
  const [won] = await db.select({ count: drizzleCount() }).from(opportunities)
    .where(whereClause ? and(whereClause, eq(opportunities.status, 'won')) : eq(opportunities.status, 'won'));
  const [lost] = await db.select({ count: drizzleCount() }).from(opportunities)
    .where(whereClause ? and(whereClause, eq(opportunities.status, 'lost')) : eq(opportunities.status, 'lost'));
  const [abandoned] = await db.select({ count: drizzleCount() }).from(opportunities)
    .where(whereClause ? and(whereClause, eq(opportunities.status, 'abandoned')) : eq(opportunities.status, 'abandoned'));

  const [totalVal] = await db.select({ total: sum(opportunities.monetaryValue) }).from(opportunities).where(whereClause);
  const [wonVal] = await db.select({ total: sum(opportunities.monetaryValue) }).from(opportunities)
    .where(whereClause ? and(whereClause, eq(opportunities.status, 'won')) : eq(opportunities.status, 'won'));

  return {
    total: total?.count || 0,
    open: open?.count || 0,
    won: won?.count || 0,
    lost: lost?.count || 0,
    abandoned: abandoned?.count || 0,
    totalValue: parseFloat(String(totalVal?.total || 0)),
    wonValue: parseFloat(String(wonVal?.total || 0)),
  };
}

