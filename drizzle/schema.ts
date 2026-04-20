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
});

export type InsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type InsertLead = typeof leads.$inferInsert;
export type Lead = typeof leads.$inferSelect;

export type InsertLeadNote = typeof leadNotes.$inferInsert;
export type LeadNote = typeof leadNotes.$inferSelect;

export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;

export type InsertKanbanColumn = typeof kanbanColumns.$inferInsert;
export type KanbanColumn = typeof kanbanColumns.$inferSelect;

export type InsertTask = typeof tasks.$inferInsert;
export type Task = typeof tasks.$inferSelect;
