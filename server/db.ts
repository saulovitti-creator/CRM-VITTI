import { eq, or, like, desc, sql, and, isNull, isNotNull, gte, lte, ne, count as drizzleCount, sum, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, leads, leadNotes, Lead, InsertLead, LeadNote, InsertLeadNote, passwordResetTokens, InsertPasswordResetToken, PasswordResetToken, kanbanColumns, KanbanColumn, InsertKanbanColumn, tasks, Task, InsertTask } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

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
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
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

/**
 * Get all leads with optional filters
 */
export async function getLeads(filters?: {
  searchTerm?: string;
  segment?: string;
  status?: string;
  type?: string;
  city?: string;
  dataInicial?: Date;
  dataFinal?: Date;
  siteStatus?: 'all' | 'with_site' | 'without_site';
}) {
  const db = await getDb();
  if (!db) return [];

  let query: any = db.select().from(leads);

  const conditions: any[] = [];

  if (filters?.type) {
    conditions.push(eq(leads.type, filters.type as any));
  }

  if (filters?.searchTerm) {
    const term = `%${filters.searchTerm}%`;
    conditions.push(
      or(
        like(leads.companyName, term),
        like(leads.contactName, term),
        like(leads.phone, term),
        like(leads.email, term),
        like(leads.city, term)
      )
    );
  }

  if (filters?.segment) {
    conditions.push(eq(leads.segment, filters.segment as any));
  }

  if (filters?.status) {
    conditions.push(sql`${leads.status} = ${filters.status as any}`);
  }

  // Filtro de data de criacao
  if (filters?.dataInicial && filters?.dataFinal) {
    conditions.push(
      and(
        gte(leads.dataCriacao, filters.dataInicial),
        lte(leads.dataCriacao, filters.dataFinal)
      )
    );
  } else if (filters?.dataInicial) {
    conditions.push(gte(leads.dataCriacao, filters.dataInicial));
  } else if (filters?.dataFinal) {
    conditions.push(lte(leads.dataCriacao, filters.dataFinal));
  }

  // Filtro de site
  if (filters?.siteStatus === 'without_site') {
    conditions.push(
      or(
        isNull(leads.site),
        eq(leads.site, '')
      )
    );
  } else if (filters?.siteStatus === 'with_site') {
    conditions.push(
      and(
        isNotNull(leads.site),
        ne(leads.site, '')
      )
    );
  }

  // Filtro de cidade
  if (filters?.city) {
    conditions.push(like(leads.city, `%${filters.city}%`));
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions));
  }

  return query.orderBy(desc(leads.dataCriacao));
}

/**
 * Get a single lead by ID
 */
export async function getLeadById(id: number) {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
  return result[0];
}

/**
 * Create a new lead
 */
export async function createLead(lead: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const processedLead: any = { ...lead };
  if (processedLead.implementationValue !== undefined && typeof processedLead.implementationValue === 'string') {
    processedLead.implementationValue = parseFloat(processedLead.implementationValue) || null;
  }
  if (processedLead.recurringValue !== undefined && typeof processedLead.recurringValue === 'string') {
    processedLead.recurringValue = parseFloat(processedLead.recurringValue) || null;
  }
  // Fornecer valor padrão para motivoSaida se não fornecido
  if (!processedLead.motivoSaida) {
    processedLead.motivoSaida = "";
  }
  // Fornecer valor padrão para type se não fornecido
  if (!processedLead.type) {
    processedLead.type = "CRM";
  }
  // Usar data de criação fornecida ou data atual
  if (!processedLead.dataCriacao) {
    processedLead.dataCriacao = new Date();
  }

  const result = await db.insert(leads).values(processedLead);
  const insertedId = (result as any).insertId;
  if (insertedId) {
    return getLeadById(insertedId);
  }
  return result;
}

/**
 * Update a lead
 */
export async function updateLead(id: number, updates: Partial<InsertLead>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Convert string values to proper types for decimal fields
  const processedUpdates: any = { ...updates };
  if (processedUpdates.implementationValue !== undefined && typeof processedUpdates.implementationValue === 'string') {
    processedUpdates.implementationValue = parseFloat(processedUpdates.implementationValue) || null;
  }
  if (processedUpdates.recurringValue !== undefined && typeof processedUpdates.recurringValue === 'string') {
    processedUpdates.recurringValue = parseFloat(processedUpdates.recurringValue) || null;
  }

  const result = await db.update(leads).set(processedUpdates).where(eq(leads.id, id));
  return result;
}

/**
 * Delete a lead
 */
export async function deleteLead(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Remove dependências primeiro para evitar erro de Foreign Key
  await db.delete(leadNotes).where(eq(leadNotes.leadId, id));
  await db.delete(tasks).where(eq(tasks.leadId, id));
  
  const result = await db.delete(leads).where(eq(leads.id, id));
  return result;
}

/**
 * Get lead statistics (count by status)
 */
export async function getLeadStats(type?: string) {
  const db = await getDb();
  if (!db) return {};

  let query: any = db.select().from(leads);
  
  if (type) {
    query = query.where(eq(leads.type, type as any));
  }
  
  const allLeads = await query;
  const stats: Record<string, number> = {};

  allLeads.forEach((lead: any) => {
    stats[lead.status] = (stats[lead.status] || 0) + 1;
  });

  return stats;
}

/**
 * Get notes for a lead
 */
export async function getLeadNotes(leadId: number): Promise<LeadNote[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(leadNotes).where(eq(leadNotes.leadId, leadId)).orderBy(desc(leadNotes.createdAt));
}

/**
 * Create a note for a lead
 */
export async function createLeadNote(note: InsertLeadNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.insert(leadNotes).values(note);
}

/**
 * Create a system note (timeline log)
 */
export async function createSystemNote(leadId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(leadNotes).values({ leadId, content, noteType: "system" });
}

/**
 * Delete a note
 */
export async function deleteLeadNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(leadNotes).where(eq(leadNotes.id, id));
}

/**
 * Clear all leads and notes
 */
export async function clearAllLeads() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Localizar todos os leads que NÃO estão com status 'Ganho'
  const replaceableLeads = await db.select({ id: leads.id }).from(leads).where(ne(leads.status, "Ganho"));
  const replaceableIds = replaceableLeads.map(l => l.id);

  if (replaceableIds.length > 0) {
    // Apagar em lotes caso a base seja muito grande, mas o inArray no TiDB/MySQL aguenta bem milhares de IDs
    await db.delete(leadNotes).where(inArray(leadNotes.leadId, replaceableIds));
    await db.delete(tasks).where(inArray(tasks.leadId, replaceableIds));
    await db.delete(leads).where(inArray(leads.id, replaceableIds));
  }
}

/**
 * Delete leads by a list of IDs (bulk delete for filtered leads)
 */
export async function deleteLeadsByIds(ids: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (ids.length === 0) return { deleted: 0 };

  // Remove dependências primeiro
  await db.delete(leadNotes).where(inArray(leadNotes.leadId, ids));
  await db.delete(tasks).where(inArray(tasks.leadId, ids));
  await db.delete(leads).where(inArray(leads.id, ids));

  return { deleted: ids.length };
}

export type { Lead, InsertLead, LeadNote, InsertLeadNote, Task, InsertTask };

// ===================== TASKS =====================

export async function getTasks(leadId?: number) {
  const db = await getDb();
  if (!db) return [];
  let query: any = db.select().from(tasks);
  if (leadId) query = query.where(eq(tasks.leadId, leadId));
  return query.orderBy(desc(tasks.dueDate));
}

export async function createTask(task: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(task);
  const insertedId = (result as any).insertId;
  if (insertedId) {
    const created = await db.select().from(tasks).where(eq(tasks.id, insertedId as number)).limit(1);
    return created[0];
  }
  return result;
}

export async function completeTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(tasks).set({ completedAt: new Date() }).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(tasks).where(eq(tasks.id, id));
}

export async function getFollowUpAlerts(daysSinceContact: number = 3) {
  const db = await getDb();
  if (!db) return [];
  const cutoff = new Date(Date.now() - daysSinceContact * 24 * 60 * 60 * 1000);
  const finalStatuses = ["Perdido", "Abandonado", "Ganho"];
  return db.select().from(leads)
    .where(
      and(
        or(
          isNull(leads.lastContactAt),
          lte(leads.lastContactAt, cutoff)
        ),
        sql`${leads.status} NOT IN ('Perdido', 'Abandonado', 'Ganho')`
      )
    )
    .orderBy(leads.lastContactAt);
}

// ===================== DASHBOARD =====================

export async function getDashboardStats(type?: string, dataInicial?: Date, dataFinal?: Date) {
  const db = await getDb();
  if (!db) return null;

  const conditions = [];
  if (type) conditions.push(eq(leads.type, type as any));
  if (dataInicial) conditions.push(gte(leads.dataCriacao, dataInicial));
  if (dataFinal) conditions.push(lte(leads.dataCriacao, dataFinal));
  
  const baseFilter = conditions.length > 0 ? and(...conditions) : undefined;

  // Total leads
  const totalRes = await db.select({ c: sql<number>`count(*)` }).from(leads).where(baseFilter);
  const totalLeads = totalRes[0]?.c || 0;

  // Count by status
  const statusRes = await db.select({
    status: leads.status,
    c: sql<number>`count(*)`
  }).from(leads).where(baseFilter).groupBy(leads.status);

  const countByStatus: Record<string, number> = {};
  statusRes.forEach((r: any) => { countByStatus[r.status] = r.c; });

  // Ganhos (conversão)
  const ganhos = countByStatus["Ganho"] || 0;
  const taxaConversao = totalLeads > 0 ? ((ganhos / totalLeads) * 100) : 0;

  // Perdidos + Abandonados (dropout)
  const perdidos = (countByStatus["Perdido"] || 0) + (countByStatus["Abandonado"] || 0);
  const taxaDropout = totalLeads > 0 ? ((perdidos / totalLeads) * 100) : 0;

  // Dinheiro na mesa (leads ativos, não finais)
  const activeLeads = await db.select({
    totalImpl: sql<number>`COALESCE(SUM(CAST(implementationValue AS DECIMAL(10,2))), 0)`,
    totalRec: sql<number>`COALESCE(SUM(CAST(recurringValue AS DECIMAL(10,2))), 0)`,
  }).from(leads).where(
    and(
      baseFilter,
      sql`${leads.status} NOT IN ('Perdido', 'Abandonado', 'Ganho')`
    )
  );

  const dinheiroNaMesa = {
    implementacao: Number(activeLeads[0]?.totalImpl || 0),
    recorrencia: Number(activeLeads[0]?.totalRec || 0),
  };

  // Valor total ganho
  const ganhoRes = await db.select({
    total: sql<number>`COALESCE(SUM(CAST(valorFechado AS DECIMAL(10,2))), 0)`
  }).from(leads).where(
    and(baseFilter, eq(leads.status, "Ganho" as any))
  );
  const valorTotalGanho = Number(ganhoRes[0]?.total || 0);

  // Tempo médio no funil (apenas leads com status final)
  const tempoRes = await db.select({
    avg: sql<number>`COALESCE(AVG(tempoNoFunil), 0)`
  }).from(leads).where(
    and(baseFilter, isNotNull(leads.tempoNoFunil))
  );
  const tempoMedioFunil = Math.round(Number(tempoRes[0]?.avg || 0));

  // Leads por segmento
  const segRes = await db.select({
    segment: leads.segment,
    c: sql<number>`count(*)`
  }).from(leads).where(baseFilter).groupBy(leads.segment);
  const leadsPorSegmento: Record<string, number> = {};
  segRes.forEach((r: any) => { if (r.segment) leadsPorSegmento[r.segment] = r.c; });

  // Leads criados por mês (últimos 6 meses)
  let timeChartFilter = baseFilter;
  if (!dataInicial) {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    timeChartFilter = and(baseFilter, gte(leads.dataCriacao, sixMonthsAgo));
  }
  
  const monthlyRes = await db.select({
    month: sql<string>`DATE_FORMAT(dataCriacao, '%Y-%m')`,
    c: sql<number>`count(*)`
  }).from(leads).where(timeChartFilter)
  .groupBy(sql`DATE_FORMAT(dataCriacao, '%Y-%m')`).orderBy(sql`DATE_FORMAT(dataCriacao, '%Y-%m')`);
  const leadsPorMes = monthlyRes.map((r: any) => ({ month: r.month, count: r.c }));

  // Leads sem contato > 3 dias (frios)
  const cutoff3 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const friosRes = await db.select({ c: sql<number>`count(*)` }).from(leads).where(
    and(
      baseFilter,
      or(isNull(leads.lastContactAt), lte(leads.lastContactAt, cutoff3)),
      sql`${leads.status} NOT IN ('Perdido', 'Abandonado', 'Ganho')`
    )
  );
  const leadsFrios = friosRes[0]?.c || 0;

  return {
    totalLeads,
    countByStatus,
    taxaConversao: Number(taxaConversao.toFixed(1)),
    taxaDropout: Number(taxaDropout.toFixed(1)),
    dinheiroNaMesa,
    valorTotalGanho,
    tempoMedioFunil,
    leadsPorSegmento,
    leadsPorMes,
    leadsFrios,
    ganhos,
    perdidos,
  };
}

// TODO: add feature queries here as your schema grows.

/**
 * Get count of leads by type
 */
export async function getLeadCountByType(type: "CRM" | "Site") {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(eq(leads.type, type));

  return result[0]?.count || 0;
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


/**
 * Move lead to final status (Perdido, Abandonado, Ganho)
 * Calculates tempo_no_funil and mes_referencia automatically
 */
export async function moveLeadToFinalStatus(
  id: number,
  status: "Perdido" | "Abandonado" | "Ganho",
  valorFechado?: number,
  motivoSaida?: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the lead to calculate tempo_no_funil
  const lead = await getLeadById(id);
  if (!lead) throw new Error("Lead not found");

  // Calculate tempo_no_funil (days between creation and now)
  const createdDate = new Date(lead.createdAt);
  const now = new Date();
  const tempoNoFunil = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

  // Calculate mes_referencia (YYYY-MM format)
  const mesReferencia = now.toISOString().substring(0, 7);

  // Map status to final_status enum value
  const statusFinalMap: Record<string, "perdido" | "abandonado" | "ganho"> = {
    "Perdido": "perdido",
    "Abandonado": "abandonado",
    "Ganho": "ganho",
  };

  const updates: any = {
    status,
    statusFinal: statusFinalMap[status],
    dataStatusFinal: new Date(),
    tempoNoFunil,
    mesReferencia,
  };

  if (motivoSaida) {
    updates.motivoSaida = motivoSaida;
  }

  if (status === "Ganho" && valorFechado !== undefined) {
    updates.valorFechado = valorFechado;
  }

  const result = await db.update(leads).set(updates).where(eq(leads.id, id));
  return result;
}


/**
 * Get all kanban columns with lead count
 */
export async function getKanbanColumns() {
  const db = await getDb();
  if (!db) return [];

  const columns = await db.select().from(kanbanColumns).orderBy(kanbanColumns.order);
  
  // Get lead counts for each column
  const columnsWithCounts = await Promise.all(
    columns.map(async (col) => {
      const count = await db
        .select({ count: sql<number>`count(*)` })
        .from(leads)
        .where(sql`${leads.status} = ${col.name}`);
      
      return {
        ...col,
        leadCount: count[0]?.count || 0,
      };
    })
  );

  return columnsWithCounts;
}

/**
 * Create a new kanban column
 */
export async function createKanbanColumn(column: InsertKanbanColumn) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const maxOrder = await db
    .select({ maxOrder: sql<number>`max(\`order\`)` })
    .from(kanbanColumns);

  const nextOrder = (maxOrder[0]?.maxOrder || 0) + 1;

  const result = await db.insert(kanbanColumns).values({
    ...column,
    order: nextOrder,
  });

  // Return the created column with ID
  const createdColumn = await db
    .select()
    .from(kanbanColumns)
    .where(eq(kanbanColumns.order, nextOrder))
    .limit(1);

  return createdColumn[0];
}

/**
 * Update a kanban column
 */
export async function updateKanbanColumn(id: number, column: Partial<InsertKanbanColumn>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(kanbanColumns).set(column).where(eq(kanbanColumns.id, id));
}

/**
 * Delete a kanban column
 */
export async function deleteKanbanColumn(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.delete(kanbanColumns).where(eq(kanbanColumns.id, id));
}

/**
 * Reorder kanban columns
 */
export async function reorderKanbanColumns(columnIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  for (let i = 0; i < columnIds.length; i++) {
    await db.update(kanbanColumns).set({ order: i }).where(eq(kanbanColumns.id, columnIds[i]));
  }
}

/**
 * Move leads from one column to another
 */
export async function moveLeadsToColumn(fromColumnName: string, toColumnName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.update(leads).set({ status: toColumnName as any }).where(sql`${leads.status} = ${fromColumnName}`);
}

/**
 * Get lead count for a column
 */
export async function getColumnLeadCount(columnName: string) {
  const db = await getDb();
  if (!db) return 0;

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(leads)
    .where(sql`${leads.status} = ${columnName}`);

  return result[0]?.count || 0;
}

/**
 * Get leads in a specific column
 */
export async function getLeadsInColumn(columnName: string) {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(leads).where(sql`${leads.status} = ${columnName}`).limit(5);
}

export type { KanbanColumn, InsertKanbanColumn };
