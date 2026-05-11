import { config } from 'dotenv';
config();
import { getDb, createLead, getLeads, getDashboardStats } from '../../server/db';
import { sql } from 'drizzle-orm';

async function test() {
  try {
     const db = await getDb();
     if (!db) return console.log("DB null");
     const stats = await getDashboardStats();
     console.log("Stats work!", Object.keys(stats || {}));

     const lead = await createLead({
        companyName: 'Test Empresa',
        segment: 'Tecnologia'
     });
     console.log("Lead created", lead?.id);
  } catch (e) {
     console.error("Error: ", e);
  }
  process.exit();
}
test();
