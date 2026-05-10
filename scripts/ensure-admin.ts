import "dotenv/config";
import { getDb } from "../server/db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../server/auth-utils";

async function ensureAdmin() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Erro: Não foi possível conectar ao banco de dados.");
    process.exit(1);
  }

  const username = "vlicrm";
  const password = "vlicrm";
  const email = "admin@vlicrm.local";

  try {
    const existingUsers = await db.select().from(users).where(eq(users.username, username));

    if (existingUsers.length > 0) {
      // Atualizar o usuário existente para admin e redefinir senha
      await db.update(users)
        .set({
          role: "admin",
          passwordHash: hashPassword(password),
          updatedAt: new Date(),
        })
        .where(eq(users.username, username));

      console.log(`✅ Usuário '${username}' já existia. A role foi ajustada para 'admin' e a senha foi redefinida com sucesso.`);
    } else {
      // Criar novo usuário admin
      await db.insert(users).values({
        username,
        passwordHash: hashPassword(password),
        name: "Admin VLI",
        email,
        role: "admin",
      });

      console.log(`✅ Novo usuário '${username}' criado com sucesso com a role 'admin'.`);
    }

    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao garantir admin:", error);
    process.exit(1);
  }
}

ensureAdmin();
