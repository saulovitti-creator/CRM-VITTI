import { drizzle } from "drizzle-orm/mysql2";
import { leads } from "../drizzle/schema.js";
import { nanoid } from "nanoid";

const mockLeads = [
  {
    id: nanoid(),
    companyName: "Clínica São Paulo Odontologia",
    contactName: "Dr. Carlos Silva",
    phone: "11987654321",
    email: "carlos@clinicasp.com.br",
    category: "Clínica",
    status: "Entrar em contato",
    city: "São Paulo",
    notes: "Clínica especializada em ortodontia",
    lastInteraction: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: nanoid(),
    companyName: "Restaurante Sabor Mineiro",
    contactName: "Mariana Costa",
    phone: "31988776655",
    email: "mariana@sabor-mineiro.com.br",
    category: "Restaurante",
    status: "Contatado",
    city: "Belo Horizonte",
    notes: "Culinária mineira tradicional",
    lastInteraction: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: nanoid(),
    companyName: "Bar do João",
    contactName: "João Pedro",
    phone: "21987654432",
    email: "joao@bardojao.com.br",
    category: "Bar",
    status: "Não Respondeu",
    city: "Rio de Janeiro",
    notes: "Bar tradicional no centro",
    lastInteraction: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: nanoid(),
    companyName: "Clínica Geral Vitória",
    contactName: "Dra. Fernanda Oliveira",
    phone: "27999887766",
    email: "fernanda@clinicavitoria.com.br",
    category: "Clínica",
    status: "Interessado",
    city: "Vitória",
    notes: "Clínica com atendimento 24h",
    lastInteraction: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: nanoid(),
    companyName: "Pizzaria Napolitana",
    contactName: "Giuseppe Rossi",
    phone: "85988776655",
    email: "giuseppe@napolitana.com.br",
    category: "Restaurante",
    status: "Não possui Interesse",
    city: "Fortaleza",
    notes: "Pizzaria com forno de lenha",
    lastInteraction: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: nanoid(),
    companyName: "Bar Boteco da Esquina",
    contactName: "Roberto Alves",
    phone: "47987654321",
    email: "roberto@boteco.com.br",
    category: "Bar",
    status: "Entrar em contato",
    city: "Blumenau",
    notes: "Boteco com cerveja artesanal",
    lastInteraction: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: nanoid(),
    companyName: "Clínica Dermatológica Premium",
    contactName: "Dra. Beatriz Santos",
    phone: "61987654432",
    email: "beatriz@dermatologia.com.br",
    category: "Clínica",
    status: "Contatado",
    city: "Brasília",
    notes: "Especializada em tratamentos estéticos",
    lastInteraction: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: nanoid(),
    companyName: "Restaurante Churrascaria Gaúcha",
    contactName: "Rafael Gomes",
    phone: "51988776655",
    email: "rafael@churrascaria.com.br",
    category: "Restaurante",
    status: "Interessado",
    city: "Porto Alegre",
    notes: "Churrascaria com rodízio completo",
    lastInteraction: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: nanoid(),
    companyName: "Bar Lounge Copacabana",
    contactName: "Sophia Martins",
    phone: "21999887766",
    email: "sophia@barlounge.com.br",
    category: "Bar",
    status: "Não Respondeu",
    city: "Rio de Janeiro",
    notes: "Bar sofisticado com vista para o mar",
    lastInteraction: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: nanoid(),
    companyName: "Clínica Veterinária Patas Felizes",
    contactName: "Dr. Lucas Ferreira",
    phone: "11988776655",
    email: "lucas@patasfelizes.com.br",
    category: "Clínica",
    status: "Não possui Interesse",
    city: "São Paulo",
    notes: "Clínica veterinária com urgência 24h",
    lastInteraction: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

async function seedLeads() {
  try {
    const db = drizzle(process.env.DATABASE_URL);

    console.log("🌱 Iniciando seed de leads fictícios...");

    for (const lead of mockLeads) {
      await db.insert(leads).values(lead);
      console.log(`✅ Lead criado: ${lead.companyName}`);
    }

    console.log("🎉 Seed concluído com sucesso!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Erro ao fazer seed:", error);
    process.exit(1);
  }
}

seedLeads();
