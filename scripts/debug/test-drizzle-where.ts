import { eq, or, like, desc, sql, and, isNull, isNotNull, gte, lte, ne } from "drizzle-orm";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { drizzle } from "drizzle-orm/mysql2";

// Fake leads
const leads = {
  type: "type",
  segment: "segment",
  status: "status"
};

const conditions = [];
conditions.push(eq(leads.type as any, "CRM"));
conditions.push(eq(leads.segment as any, "Energia"));

const andCond = and(...conditions);
console.log(andCond);
