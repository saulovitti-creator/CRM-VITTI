import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { clearAllLeads } from "./db";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-optional",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Import Leads with Optional Fields", () => {
  beforeAll(async () => {
    await clearAllLeads();
  });

  afterAll(async () => {
    await clearAllLeads();
  });

  it("should import lead with only required fields (no optional fields)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const timestamp = Date.now();
    const leadsToImport = [
      {
        companyName: `Empresa Minimalista ${timestamp}`,
        phone: "11999999999",
        segment: "Clínica",
        status: "Entrar em contato" as const,
        // Sem contactName, email, city, notes
      },
    ];

    const result = await caller.leads.importLeads({
      leads: leadsToImport,
      type: "CRM",
    });

    expect(result).toBeDefined();
    expect(result.total).toBe(1);
  });

  it("should import lead with partial optional fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const timestamp = Date.now();
    const leadsToImport = [
      {
        companyName: `Empresa Parcial ${timestamp}`,
        phone: "11988888888",
        segment: "Bar",
        status: "Contatado" as const,
        contactName: "João Silva", // Tem contato
        // Sem email, city, notes
      },
    ];

    const result = await caller.leads.importLeads({
      leads: leadsToImport,
      type: "CRM",
    });

    expect(result).toBeDefined();
    expect(result.total).toBe(1);
  });

  it("should import lead with all fields populated", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const timestamp = Date.now();
    const leadsToImport = [
      {
        companyName: `Empresa Completa ${timestamp}`,
        contactName: "Maria Santos",
        phone: "11977777777",
        email: `maria+${timestamp}@example.com`,
        segment: "Restaurante",
        status: "Interessado" as const,
        city: "São Paulo",
        notes: "Prospecto com todos os dados preenchidos",
      },
    ];

    const result = await caller.leads.importLeads({
      leads: leadsToImport,
      type: "CRM",
    });

    expect(result).toBeDefined();
    expect(result.total).toBe(1);
  });
});
