import "dotenv/config";
import { registerUser } from "./server/db.js"; // Requires transpilation or using tsx

async function test() {
  try {
    console.log("Tentando criar user...");
    const user = await registerUser("admin_teste_2", "admin2@teste.com", "hashfalso123");
    console.log("Sucesso:", user);
  } catch (e: any) {
    console.error("Falha ao registrar:", e);
    if (e.cause) console.error("Causa:", e.cause);
  }
}

test();
