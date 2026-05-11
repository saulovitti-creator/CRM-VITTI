import { getLeads } from "../../server/db.js";

async function test() {
  const result = await getLeads({
    segment: "Energia Solar",
    status: "Interessado",
    type: "CRM"
  });
  console.log(`Returned ${result.length} leads.`);
  result.slice(0, 3).forEach(l => console.log(`- ${l.companyName} | ${l.segment} | ${l.status}`));
}

test().catch(console.error);
