import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const { isAuthDisabled } = await import("../auth-utils");
    
    if (isAuthDisabled()) {
      user = {
        id: 1, // Simulated admin ID
        username: "admin-teste",
        passwordHash: "",
        openId: "bypass_admin_001",
        name: "Admin (Modo Teste)",
        email: "admin@bypass.local",
        loginMethod: "local",
        role: "admin",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
        passwordResetToken: null,
        passwordResetExpires: null,
      };
      console.log("[AUTH-BYPASS] isAuthDisabled=true. Injecting Admin (Modo Teste).");
    } else {
      user = await sdk.authenticateRequest(opts.req);
    }
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
