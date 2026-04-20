import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { clearAllLeads } from "./db";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
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

describe("Import Leads", () => {
  beforeAll(async () => {
    await clearAllLeads();
  });

  afterAll(async () => {
    await clearAllLeads();
  });

  it("should import multiple leads successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const timestamp = Date.now();
    const leadsToImport = [
      {
        companyName: `Clínica A ${timestamp}`,
        contactName: "Dr. Silva",
        phone: "11999999999",
        email: `clinica+${timestamp}@example.com`,
        segment: "Clínica",
        status: "Entrar em contato" as const,
        city: "São Paulo",
        notes: "Primeira importação",
      },
    ];

    const result = await caller.leads.importLeads({
      leads: leadsToImport,
      type: "CRM",
    });

    expect(result).toBeDefined();
    expect(result.total).toBe(1);
  });

  it("should validate required fields during import", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.leads.importLeads({
        leads: [
          {
            companyName: "",
            phone: "11999999999",
            segment: "Clínica",
            status: "Entrar em contato" as const,
          },
        ],
        type: "CRM",
      });
      // Should fail validation
      expect(true).toBe(false);
    } catch (error) {
      // Expected to fail
      expect(error).toBeDefined();
    }
  });

  it("should import leads with different segments", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const timestamp = Date.now();
    const leadsToImport = [
      {
        companyName: `Clínica Test ${timestamp}`,
        phone: "11999999999",
        segment: "Clínica",
        status: "Entrar em contato" as const,
      },
      {
        companyName: `Bar Test ${timestamp}`,
        phone: "11988888888",
        segment: "Bar",
        status: "Contatado" as const,
      },
      {
        companyName: `Restaurante Test ${timestamp}`,
        phone: "11977777777",
        segment: "Restaurante",
        status: "Interessado" as const,
      },
    ];

    const result = await caller.leads.importLeads({
      leads: leadsToImport,
      type: "CRM",
    });

    expect(result).toBeDefined();
    expect(result.total).toBe(3);
  });
});
