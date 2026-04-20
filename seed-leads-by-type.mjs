import mysql from 'mysql2/promise';

const LEADS_CRM = [
  {
    companyName: "Clínica Sorriso Perfeito",
    contactName: "Dr. Carlos Silva",
    phone: "11 98765-4321",
    email: "carlos@clinicasorriso.com.br",
    category: "Clínica",
    status: "Entrar em contato",
    type: "CRM",
    city: "São Paulo",
    site: "https://clinicasorriso.com.br"
  },
  {
    companyName: "Restaurante Sabor Mineiro",
    contactName: "Ana Costa",
    phone: "31 99876-5432",
    email: "ana@sabor-mineiro.com.br",
    category: "Restaurante",
    status: "Contatado",
    type: "CRM",
    city: "Belo Horizonte",
    site: "https://sabor-mineiro.com.br"
  },
  {
    companyName: "Bar do João",
    contactName: "João Silva",
    phone: "21 98765-4321",
    email: "joao@bardojoao.com.br",
    category: "Bar",
    status: "Interessado",
    type: "CRM",
    city: "Rio de Janeiro",
    site: "https://bardojoao.com.br"
  },
  {
    companyName: "Tech Solutions Brasil",
    contactName: "Roberto Ferreira",
    phone: "11 99876-5432",
    email: "roberto@techsolutions.com.br",
    category: "Empresa",
    status: "Não Respondeu",
    type: "CRM",
    city: "São Paulo",
    site: "https://techsolutions.com.br"
  },
  {
    companyName: "Clínica Odontológica Smile",
    contactName: "Dra. Mariana Santos",
    phone: "85 98765-4321",
    email: "mariana@clinicasmile.com.br",
    category: "Clínica",
    status: "Não possui Interesse",
    type: "CRM",
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
    category: "Restaurante",
    status: "Entrar em contato",
    type: "Site",
    city: "São Paulo",
    site: "https://pizzarianapoli.com.br"
  },
  {
    companyName: "Consultório Médico Dr. Paulo",
    contactName: "Dr. Paulo Oliveira",
    phone: "48 99876-5432",
    email: "paulo@consultoriomedico.com.br",
    category: "Clínica",
    status: "Contatado",
    type: "Site",
    city: "Santa Catarina",
    site: "https://consultoriomedico.com.br"
  },
  {
    companyName: "Bar e Boteco do Zé",
    contactName: "José Pereira",
    phone: "62 98765-4321",
    email: "ze@bardozé.com.br",
    category: "Bar",
    status: "Interessado",
    type: "Site",
    city: "Goiânia",
    site: "https://bardoze.com.br"
  },
  {
    companyName: "Consultoria Empresarial XYZ",
    contactName: "Fernanda Costa",
    phone: "11 99876-5432",
    email: "fernanda@consultoriaxy.com.br",
    category: "Empresa",
    status: "Não Respondeu",
    type: "Site",
    city: "São Paulo",
    site: "https://consultoriaxy.com.br"
  },
  {
    companyName: "Clínica Veterinária Pet Care",
    contactName: "Dra. Juliana Mendes",
    phone: "71 98765-4321",
    email: "juliana@petcare.com.br",
    category: "Clínica",
    status: "Não possui Interesse",
    type: "Site",
    city: "Salvador",
    site: "https://petcare.com.br"
  }
];

async function seedLeads() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'manus_db',
  });

  try {
    // Clear existing leads
    console.log('Limpando banco de dados...');
    await connection.execute('DELETE FROM lead_notes');
    await connection.execute('DELETE FROM leads');

    // Insert CRM leads
    console.log('Inserindo 5 leads CRM...');
    for (const lead of LEADS_CRM) {
      await connection.execute(
        `INSERT INTO leads (company_name, contact_name, phone, email, category, status, lead_type, city, site, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          lead.companyName,
          lead.contactName,
          lead.phone,
          lead.email,
          lead.category,
          lead.status,
          lead.type,
          lead.city,
          lead.site
        ]
      );
    }

    // Insert Site leads
    console.log('Inserindo 5 leads Site...');
    for (const lead of LEADS_SITE) {
      await connection.execute(
        `INSERT INTO leads (company_name, contact_name, phone, email, category, status, lead_type, city, site, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          lead.companyName,
          lead.contactName,
          lead.phone,
          lead.email,
          lead.category,
          lead.status,
          lead.type,
          lead.city,
          lead.site
        ]
      );
    }

    console.log('✅ Banco de dados populado com sucesso!');
    console.log('   - 5 leads CRM');
    console.log('   - 5 leads Site');
    console.log('   - Total: 10 leads');

  } catch (error) {
    console.error('❌ Erro ao popular banco de dados:', error);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

seedLeads();
