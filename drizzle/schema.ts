import { pgTable, text, serial, integer, varchar, timestamp, boolean, decimal } from "drizzle-orm/pg-core";
import { mysqlTable, datetime, int, boolean as mysqlBoolean, varchar as mysqlVarchar, text as mysqlText, decimal as mysqlDecimal } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const users = mysqlTable("users", {
  id: int("id").primaryKey().autoincrement(),
  username: mysqlVarchar("username", { length: 255 }).unique().notNull(),
  passwordHash: mysqlVarchar("passwordHash", { length: 255 }).notNull(),
  openId: mysqlVarchar("openId", { length: 255 }).unique(),
  name: mysqlVarchar("name", { length: 255 }),
  email: mysqlVarchar("email", { length: 255 }).unique().notNull(),
  loginMethod: mysqlVarchar("loginMethod", { length: 50 }).notNull().default("local"),
  role: mysqlVarchar("role", { length: 50 }).notNull().default("user"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  lastSignedIn: datetime("lastSignedIn"),
  passwordResetToken: mysqlVarchar("passwordResetToken", { length: 255 }),
  passwordResetExpires: datetime("passwordResetExpires"),
});

export const leads = mysqlTable("leads", {
  id: int("id").primaryKey().autoincrement(),
  companyName: mysqlVarchar("companyName", { length: 255 }).notNull(),
  contactName: mysqlVarchar("contactName", { length: 255 }),
  phone: mysqlVarchar("phone", { length: 50 }),
  email: mysqlVarchar("email", { length: 255 }),
  city: mysqlVarchar("city", { length: 255 }),
  segment: mysqlVarchar("segment", { length: 255 }),
  status: mysqlVarchar("status", { length: 50 }).notNull().default("Entrar em contato"),
  type: mysqlVarchar("type", { length: 50 }).default("CRM"),
  implementationValue: mysqlDecimal("implementationValue", { precision: 10, scale: 2 }),
  recurringValue: mysqlDecimal("recurringValue", { precision: 10, scale: 2 }),
  notes: mysqlText("notes"),
  site: mysqlVarchar("site", { length: 255 }),
  dataCriacao: datetime("dataCriacao").notNull().default(sql`CURRENT_TIMESTAMP`),
  statusFinal: mysqlVarchar("statusFinal", { length: 50 }),
  dataStatusFinal: datetime("dataStatusFinal"),
  tempoNoFunil: int("tempoNoFunil"),
  mesReferencia: mysqlVarchar("mesReferencia", { length: 50 }),
  motivoSaida: mysqlText("motivoSaida"),
  valorFechado: mysqlDecimal("valorFechado", { precision: 10, scale: 2 }),
  lastContactAt: datetime("lastContactAt"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const leadNotes = mysqlTable("lead_notes", {
  id: int("id").primaryKey().autoincrement(),
  leadId: int("leadId").notNull().references(() => leads.id),
  content: mysqlText("content").notNull(),
  noteType: mysqlVarchar("noteType", { length: 20 }).notNull().default("user"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const tasks = mysqlTable("tasks", {
  id: int("id").primaryKey().autoincrement(),
  leadId: int("leadId").notNull().references(() => leads.id),
  title: mysqlVarchar("title", { length: 120 }).notNull(),
  description: mysqlText("description"),
  dueDate: datetime("dueDate").notNull(),
  priority: mysqlVarchar("priority", { length: 10 }).notNull().default("media"),
  completedAt: datetime("completedAt"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  token: mysqlVarchar("token", { length: 255 }).notNull().unique(),
  expiresAt: datetime("expiresAt").notNull(),
  used: datetime("used"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const kanbanColumns = mysqlTable("kanban_columns", {
  id: int("id").primaryKey().autoincrement(),
  name: mysqlVarchar("name", { length: 255 }).notNull(),
  order: int("order").notNull(),
  color: mysqlVarchar("color", { length: 50 }),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
  isDefault: mysqlBoolean("isDefault").default(false),
  isActiveInFunnel: mysqlBoolean("is_active_in_funnel").default(true),
});

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertLead = typeof leads.$inferInsert;
export type Lead = typeof leads.$inferSelect;

export type InsertLeadNote = typeof leadNotes.$inferInsert;
export type LeadNote = typeof leadNotes.$inferSelect;

export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

// ===================== TAGS =====================
export const tags = mysqlTable("tags", {
  id: int("id").primaryKey().autoincrement(),
  name: mysqlVarchar("name", { length: 100 }).notNull().unique(),
  color: mysqlVarchar("color", { length: 7 }).notNull().default("#3b82f6"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const leadTags = mysqlTable("lead_tags", {
  id: int("id").primaryKey().autoincrement(),
  leadId: int("leadId").notNull().references(() => leads.id),
  tagId: int("tagId").notNull().references(() => tags.id),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ===================== CUSTOM FIELDS =====================
export const customFieldDefinitions = mysqlTable("custom_field_definitions", {
  id: int("id").primaryKey().autoincrement(),
  name: mysqlVarchar("name", { length: 255 }).notNull(),
  fieldType: mysqlVarchar("fieldType", { length: 50 }).notNull(),
  // Supported types: "text" | "textarea" | "number" | "currency" | "date" | "dropdown" | "checkbox" | "url" | "email" | "phone"
  model: mysqlVarchar("model", { length: 50 }).notNull().default("lead"),
  // "lead" now, "contact" | "opportunity" in Sprint 3
  groupName: mysqlVarchar("groupName", { length: 100 }),
  placeholder: mysqlVarchar("placeholder", { length: 255 }),
  options: mysqlText("options"), // JSON array for dropdowns: ["Op1","Op2"]
  isRequired: mysqlBoolean("isRequired").default(false),
  displayOrder: int("displayOrder").notNull().default(0),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const customFieldValues = mysqlTable("custom_field_values", {
  id: int("id").primaryKey().autoincrement(),
  definitionId: int("definitionId").notNull().references(() => customFieldDefinitions.id),
  entityId: int("entityId").notNull(), // ID of the lead (or contact/opportunity later)
  entityType: mysqlVarchar("entityType", { length: 50 }).notNull().default("lead"),
  value: mysqlText("value"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export type InsertKanbanColumn = typeof kanbanColumns.$inferInsert;
export type KanbanColumn = typeof kanbanColumns.$inferSelect;

export type InsertTask = typeof tasks.$inferInsert;
export type Task = typeof tasks.$inferSelect;

export type InsertTag = typeof tags.$inferInsert;
export type Tag = typeof tags.$inferSelect;

export type InsertLeadTag = typeof leadTags.$inferInsert;
export type LeadTag = typeof leadTags.$inferSelect;

export type InsertCustomFieldDefinition = typeof customFieldDefinitions.$inferInsert;
export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;

export type InsertCustomFieldValue = typeof customFieldValues.$inferInsert;
export type CustomFieldValue = typeof customFieldValues.$inferSelect;

// ===================== SPRINT 3: CONTACTS + OPPORTUNITIES + PIPELINES =====================

// Contatos — a pessoa/empresa (dados de "quem é")
export const contacts = mysqlTable("contacts", {
  id: int("id").primaryKey().autoincrement(),
  name: mysqlVarchar("name", { length: 255 }).notNull(),
  company: mysqlVarchar("company", { length: 255 }),
  phone: mysqlVarchar("phone", { length: 50 }),
  email: mysqlVarchar("email", { length: 255 }),
  city: mysqlVarchar("city", { length: 255 }),
  site: mysqlVarchar("site", { length: 255 }),
  segment: mysqlVarchar("segment", { length: 255 }),
  source: mysqlVarchar("source", { length: 100 }),  // Origem: Google, Indicação, etc.
  notes: mysqlText("notes"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Associação Contato ↔ Tag (many-to-many)
export const contactTags = mysqlTable("contact_tags", {
  id: int("id").primaryKey().autoincrement(),
  contactId: int("contactId").notNull().references(() => contacts.id),
  tagId: int("tagId").notNull().references(() => tags.id),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Pipelines (Funis de vendas)
export const pipelines = mysqlTable("pipelines", {
  id: int("id").primaryKey().autoincrement(),
  name: mysqlVarchar("name", { length: 255 }).notNull(),
  isDefault: mysqlBoolean("isDefault").default(false),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Estágios de cada Pipeline
export const pipelineStages = mysqlTable("pipeline_stages", {
  id: int("id").primaryKey().autoincrement(),
  pipelineId: int("pipelineId").notNull().references(() => pipelines.id),
  name: mysqlVarchar("name", { length: 255 }).notNull(),
  color: mysqlVarchar("color", { length: 50 }),
  displayOrder: int("displayOrder").notNull().default(0),
  isFinal: mysqlBoolean("isFinal").default(false),
  finalType: mysqlVarchar("finalType", { length: 20 }),  // "ganho" | "perdido" | "abandonado" | null
  isActiveInFunnel: mysqlBoolean("is_active_in_funnel").default(true),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Oportunidades (Negócios) — o que está sendo vendido
export const opportunities = mysqlTable("opportunities", {
  id: int("id").primaryKey().autoincrement(),
  contactId: int("contactId").notNull().references(() => contacts.id),
  pipelineId: int("pipelineId").notNull().references(() => pipelines.id),
  stageId: int("stageId").notNull().references(() => pipelineStages.id),
  title: mysqlVarchar("title", { length: 255 }).notNull(),
  monetaryValue: mysqlDecimal("monetaryValue", { precision: 10, scale: 2 }),
  status: mysqlVarchar("status", { length: 20 }).notNull().default("open"),  // open | won | lost | abandoned
  segment: mysqlVarchar("segment", { length: 255 }),
  source: mysqlVarchar("source", { length: 100 }),
  notes: mysqlText("notes"),
  wonAt: datetime("wonAt"),
  lostAt: datetime("lostAt"),
  lostReason: mysqlText("lostReason"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

// Notas de Oportunidade (timeline por negócio)
export const opportunityNotes = mysqlTable("opportunity_notes", {
  id: int("id").primaryKey().autoincrement(),
  opportunityId: int("opportunityId").notNull().references(() => opportunities.id),
  content: mysqlText("content").notNull(),
  noteType: mysqlVarchar("noteType", { length: 20 }).notNull().default("user"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Tarefas vinculadas a Oportunidades
export const opportunityTasks = mysqlTable("opportunity_tasks", {
  id: int("id").primaryKey().autoincrement(),
  opportunityId: int("opportunityId").notNull().references(() => opportunities.id),
  title: mysqlVarchar("title", { length: 120 }).notNull(),
  description: mysqlText("description"),
  dueDate: datetime("dueDate").notNull(),
  priority: mysqlVarchar("priority", { length: 10 }).notNull().default("media"),
  completedAt: datetime("completedAt"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// Type exports — Sprint 3
export type InsertContact = typeof contacts.$inferInsert;
export type Contact = typeof contacts.$inferSelect;

export type InsertContactTag = typeof contactTags.$inferInsert;
export type ContactTag = typeof contactTags.$inferSelect;

export type InsertPipeline = typeof pipelines.$inferInsert;
export type Pipeline = typeof pipelines.$inferSelect;

export type InsertPipelineStage = typeof pipelineStages.$inferInsert;
export type PipelineStage = typeof pipelineStages.$inferSelect;

export type InsertOpportunity = typeof opportunities.$inferInsert;
export type Opportunity = typeof opportunities.$inferSelect;

export type InsertOpportunityNote = typeof opportunityNotes.$inferInsert;
export type OpportunityNote = typeof opportunityNotes.$inferSelect;

export type InsertOpportunityTask = typeof opportunityTasks.$inferInsert;
export type OpportunityTask = typeof opportunityTasks.$inferSelect;
