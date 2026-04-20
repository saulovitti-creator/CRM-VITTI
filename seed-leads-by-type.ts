import { getDb } from "./server/db";
import { leads } from "./drizzle/schema";

const LEADS_CRM = [
  {
    companyName: "Clínica Sorriso Perfeito",
    contactName: "Dr. Carlos Silva",
    phone: "11 98765-4321",
    email: "carlos@clinicasorriso.com.br",
    category: "Clínica" as const,
    status: "Entrar em contato" as const,
    type: "CRM" as const,
    city: "São Paulo",
    site: "https://clinicasorriso.com.br"
  },
  {
    companyName: "Restaurante Sabor Mineiro",
    contactName: "Ana Costa",
    phone: "31 99876-5432",
    email: "ana@sabor-mineiro.com.br",
    category: "Restaurante" as const,
    status: "Contatado" as const,
    type: "CRM" as const,
    city: "Belo Horizonte",
    site: "https://sabor-mineiro.com.br"
  },
  {
    companyName: "Bar do João",
    contactName: "João Silva",
    phone: "21 98765-4321",
    email: "joao@bardojoao.com.br",
    category: "Bar" as const,
    status: "Interessado" as const,
    type: "CRM" as const,
    city: "Rio de Janeiro",
    site: "https://bardojoao.com.br"
  },
  {
    companyName: "Tech Solutions Brasil",
    contactName: "Roberto Ferreira",
    phone: "11 99876-5432",
    email: "roberto@techsolutions.com.br",
    category: "Empresa" as const,
    status: "Não Respondeu" as const,
    type: "CRM" as const,
    city: "São Paulo",
    site: "https://techsolutions.com.br"
  },
  {
    companyName: "Clínica Odontológica Smile",
    contactName: "Dra. Mariana Santos",
    phone: "85 98765-4321",
    email: "mariana@clinicasmile.com.br",
    category: "Clínica" as const,
    status: "Não possui Interesse" as const,
    type: "CRM" as const,
    city: "Fortaleza",
    site: "https://clinicasmile.com.br"
  }
];

const LEADS_SITE = [
  {
    companyName: "Pizzaria Napoli",
    contactName: "Marco Rossi",
    phone: "11 98765-4321",
    email: "marco@pizzarianapoli.com.br",
    category: "Restaurante" as const,
    status: "Entrar em contato" as const,
    type: "Site" as const,
    city: "São Paulo",
    site: "https://pizzarianapoli.com.br"
  },
  {
    companyName: "Consultório Médico Dr. Paulo",
    contactName: "Dr. Paulo Oliveira",
    phone: "48 99876-5432",
    email: "paulo@consultoriomedico.com.br",
    category: "Clínica" as const,
    status: "Contatado" as const,
    type: "Site" as const,
    city: "Santa Catarina",
    site: "https://consultoriomedico.com.br"
  },
  {
    companyName: "Bar e Boteco do Zé",
    contactName: "José Pereira",
    phone: "62 98765-4321",
    email: "ze@bardozé.com.br",
    category: "Bar" as const,
    status: "Interessado" as const,
    type: "Site" as const,
    city: "Goiânia",
    site: "https://bardoze.com.br"
  },
  {
    companyName: "Consultoria Empresarial XYZ",
    contactName: "Fernanda Costa",
    phone: "11 99876-5432",
    email: "fernanda@consultoriaxy.com.br",
    category: "Empresa" as const,
    status: "Não Respondeu" as const,
    type: "Site" as const,
    city: "São Paulo",
    site: "https://consultoriaxy.com.br"
  },
  {
    companyName: "Clínica Veterinária Pet Care",
    contactName: "Dra. Juliana Mendes",
    phone: "71 98765-4321",
    email: "juliana@petcare.com.br",
    category: "Clínica" as const,
    status: "Não possui Interesse" as const,
    type: "Site" as const,
    city: "Salvador",
    site: "https://petcare.com.br"
  }
];

async function seedLeads() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("❌ Banco de dados não disponível");
      process.exit(1);
    }

    // Clear existing leads
    console.log("🗑️  Limpando banco de dados...");
    await db.delete(leads);

    // Insert CRM leads
    console.log("📝 Inserindo 5 leads CRM...");
    for (const lead of LEADS_CRM) {
      await db.insert(leads).values(lead);
    }

    // Insert Site leads
    console.log("📝 Inserindo 5 leads Site...");
    for (const lead of LEADS_SITE) {
      await db.insert(leads).values(lead);
    }

    console.log("✅ Banco de dados populado com sucesso!");
    console.log("   - 5 leads CRM");
    console.log("   - 5 leads Site");
    console.log("   - Total: 10 leads");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao popular banco de dados:", error);
    process.exit(1);
  }
}

seedLeads();
