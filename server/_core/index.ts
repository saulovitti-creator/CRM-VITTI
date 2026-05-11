import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

import { getDb } from "../db";
import { sql } from "drizzle-orm";

function extractCount(result: unknown): number {
  const rows = Array.isArray(result)
    ? result
    : Array.isArray((result as any)?.rows)
      ? (result as any).rows
      : [];
  const firstRow = rows[0] as Record<string, unknown> | undefined;
  const rawCount = firstRow?.count ?? firstRow?.COUNT ?? 0;
  return Number(rawCount) || 0;
}

async function tableExists(db: any, tableName: string): Promise<boolean> {
  const result = await db.execute(
    sql`
      SELECT COUNT(*) AS count
      FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${tableName}
    `
  );
  return extractCount(result) > 0;
}

async function columnExists(db: any, tableName: string, columnName: string): Promise<boolean> {
  const result = await db.execute(
    sql`
      SELECT COUNT(*) AS count
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ${tableName}
        AND COLUMN_NAME = ${columnName}
    `
  );
  return extractCount(result) > 0;
}

async function applyPendingMigrations() {
  const db = await getDb();
  if (!db) return;

  try {
    const hasKanbanColumns = await tableExists(db, "kanban_columns");
    if (!hasKanbanColumns) {
      console.warn("[Migration] kanban_columns not found, skipping legacy migration.");
    } else {
      const hasIsActiveInFunnel = await columnExists(db, "kanban_columns", "is_active_in_funnel");
      if (hasIsActiveInFunnel) {
        console.log("[Migration] kanban_columns.is_active_in_funnel already exists, skipping.");
      } else {
        await db.execute(sql`ALTER TABLE kanban_columns ADD COLUMN is_active_in_funnel BOOLEAN DEFAULT true`);
        await db.execute(sql`UPDATE kanban_columns SET is_active_in_funnel = false WHERE name IN ('Ganho', 'Perdido', 'Abandonado')`);
        console.log("[Migration] kanban_columns.is_active_in_funnel created.");
      }
    }
  } catch (error) {
    console.error("[Migration] kanban_columns migration failed:", error);
  }

  try {
    const hasPipelineStages = await tableExists(db, "pipeline_stages");
    if (!hasPipelineStages) {
      console.warn("[Migration] pipeline_stages not found, skipping migration.");
    } else {
      const hasIsActiveInFunnel = await columnExists(db, "pipeline_stages", "is_active_in_funnel");
      if (hasIsActiveInFunnel) {
        console.log("[Migration] pipeline_stages.is_active_in_funnel already exists, skipping.");
      } else {
        await db.execute(sql`ALTER TABLE pipeline_stages ADD COLUMN is_active_in_funnel BOOLEAN DEFAULT true`);
        await db.execute(sql`UPDATE pipeline_stages SET is_active_in_funnel = false WHERE name IN ('Ganho', 'Perdido', 'Abandonado')`);
        console.log("[Migration] pipeline_stages.is_active_in_funnel created.");
      }
    }
  } catch (error) {
    console.error("[Migration] pipeline_stages migration failed:", error);
  }
}

async function startServer() {
  await applyPendingMigrations();
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  const isDev = process.env.NODE_ENV?.trim() !== "production";
  if (isDev) {
    console.log("[Server] Starting in DEVELOPMENT mode (Vite Configured)");
    await setupVite(app, server);
  } else {
    console.log("[Server] Starting in PRODUCTION mode (Static Files)");
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
