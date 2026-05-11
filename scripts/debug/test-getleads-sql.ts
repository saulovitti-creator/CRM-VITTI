import { getDb, getLeads } from "../../server/db.ts";

async function testSQL() {
  // First, initialize DB if possible (might not work without DATABASE_URL, but we just want to see the sql builder)
  console.log("Generating SQL...");
  const query = await getLeads({
    segment: "Energia Solar",
    status: "Interessado",
    type: "CRM"
  });
  
  if (query.toSQL) {
    console.log("SQL:", query.toSQL().sql);
    console.log("Params:", query.toSQL().params);
  } else {
    console.log("Query object does not have toSQL()");
  }
  process.exit(0);
}

testSQL().catch(console.error);
