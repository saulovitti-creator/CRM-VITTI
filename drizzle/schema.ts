import { mysqlTable, datetime, int, boolean as mysqlBoolean, varchar as mysqlVarchar, text as mysqlText, decimal as mysqlDecimal, index } from "drizzle-orm/mysql-core";
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

export const passwordResetTokens = mysqlTable("password_reset_tokens", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("userId").notNull().references(() => users.id),
  token: mysqlVarchar("token", { length: 255 }).notNull().unique(),
  expiresAt: datetime("expiresAt").notNull(),
  used: datetime("used"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ===================== TAGS =====================
export const tags = mysqlTable("tags", {
  id: int("id").primaryKey().autoincrement(),
  name: mysqlVarchar("name", { length: 100 }).notNull().unique(),
  color: mysqlVarchar("color", { length: 7 }).notNull().default("#3b82f6"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ===================== CUSTOM FIELDS =====================
export const customFieldDefinitions = mysqlTable("custom_field_definitions", {
  id: int("id").primaryKey().autoincrement(),
  name: mysqlVarchar("name", { length: 255 }).notNull(),
  fieldType: mysqlVarchar("fieldType", { length: 50 }).notNull(),
  model: mysqlVarchar("model", { length: 50 }).notNull().default("contact"),
  groupName: mysqlVarchar("groupName", { length: 100 }),
  placeholder: mysqlVarchar("placeholder", { length: 255 }),
  options: mysqlText("options"),
  isRequired: mysqlBoolean("isRequired").default(false),
  displayOrder: int("displayOrder").notNull().default(0),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const customFieldValues = mysqlTable("custom_field_values", {
  id: int("id").primaryKey().autoincrement(),
  definitionId: int("definitionId").notNull().references(() => customFieldDefinitions.id),
  entityId: int("entityId").notNull(),
  entityType: mysqlVarchar("entityType", { length: 50 }).notNull().default("contact"),
  value: mysqlText("value"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
  idx_cfv_entity_type_id: index("idx_cfv_entity_type_id").on(table.entityType, table.entityId),
}));

// ===================== CONTACTS =====================
export const contacts = mysqlTable("contacts", {
  id: int("id").primaryKey().autoincrement(),
  name: mysqlVarchar("name", { length: 255 }).notNull(),
  company: mysqlVarchar("company", { length: 255 }),
  phone: mysqlVarchar("phone", { length: 50 }),
  email: mysqlVarchar("email", { length: 255 }),
  city: mysqlVarchar("city", { length: 255 }),
  site: mysqlVarchar("site", { length: 255 }),
  segment: mysqlVarchar("segment", { length: 255 }),
  source: mysqlVarchar("source", { length: 100 }),
  notes: mysqlText("notes"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const contactTags = mysqlTable("contact_tags", {
  id: int("id").primaryKey().autoincrement(),
  contactId: int("contactId").notNull().references(() => contacts.id),
  tagId: int("tagId").notNull().references(() => tags.id),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ===================== PIPELINES =====================
export const pipelines = mysqlTable("pipelines", {
  id: int("id").primaryKey().autoincrement(),
  name: mysqlVarchar("name", { length: 255 }).notNull(),
  isDefault: mysqlBoolean("isDefault").default(false),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
});

export const pipelineStages = mysqlTable("pipeline_stages", {
  id: int("id").primaryKey().autoincrement(),
  pipelineId: int("pipelineId").notNull().references(() => pipelines.id),
  name: mysqlVarchar("name", { length: 255 }).notNull(),
  color: mysqlVarchar("color", { length: 50 }),
  displayOrder: int("displayOrder").notNull().default(0),
  isFinal: mysqlBoolean("isFinal").default(false),
  finalType: mysqlVarchar("finalType", { length: 20 }),
  isActiveInFunnel: mysqlBoolean("is_active_in_funnel").default(true),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ===================== OPPORTUNITIES =====================
export const opportunities = mysqlTable("opportunities", {
  id: int("id").primaryKey().autoincrement(),
  contactId: int("contactId").notNull().references(() => contacts.id),
  pipelineId: int("pipelineId").notNull().references(() => pipelines.id),
  stageId: int("stageId").notNull().references(() => pipelineStages.id),
  title: mysqlVarchar("title", { length: 255 }).notNull(),
  monetaryValue: mysqlDecimal("monetaryValue", { precision: 10, scale: 2 }),
  status: mysqlVarchar("status", { length: 20 }).notNull().default("open"),
  segment: mysqlVarchar("segment", { length: 255 }),
  source: mysqlVarchar("source", { length: 100 }),
  notes: mysqlText("notes"),
  wonAt: datetime("wonAt"),
  lostAt: datetime("lostAt"),
  lostReason: mysqlText("lostReason"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updatedAt").notNull().default(sql`CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`),
}, (table) => ({
  idx_opp_pipeline_status: index("idx_opp_pipeline_status").on(table.pipelineId, table.status),
  idx_opp_contact_id: index("idx_opp_contact_id").on(table.contactId),
}));

export const opportunityNotes = mysqlTable("opportunity_notes", {
  id: int("id").primaryKey().autoincrement(),
  opportunityId: int("opportunityId").notNull().references(() => opportunities.id),
  content: mysqlText("content").notNull(),
  noteType: mysqlVarchar("noteType", { length: 20 }).notNull().default("user"),
  createdAt: datetime("createdAt").notNull().default(sql`CURRENT_TIMESTAMP`),
});

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

// ===================== TYPE EXPORTS =====================
export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export type InsertTag = typeof tags.$inferInsert;
export type Tag = typeof tags.$inferSelect;

export type InsertCustomFieldDefinition = typeof customFieldDefinitions.$inferInsert;
export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;

export type InsertCustomFieldValue = typeof customFieldValues.$inferInsert;
export type CustomFieldValue = typeof customFieldValues.$inferSelect;

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
