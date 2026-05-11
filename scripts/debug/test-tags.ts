import "dotenv/config";
import { getLeads, getAllTags, createTag, assignTagToLead } from "../../server/db.js";

async function testTags() {
  try {
    console.log("Checking tags...");
    const tags = await getAllTags();
    console.log(`Found ${tags.length} tags.`);
    
    if (tags.length === 0) {
      console.log("Creating a test tag...");
      const newTag = await createTag({ name: "Test Tag", color: "#ff0000" }) as any;
      console.log(`Created tag: ${newTag.name} (ID: ${newTag.id})`);
      tags.push(newTag);
    }
    
    const tagId = tags[0].id;
    console.log(`Filtering by tag ID: ${tagId}`);
    const leads = await getLeads({ tagIds: [tagId] });
    console.log(`Found ${leads.length} leads with tag ${tags[0].name}.`);
    
    console.log("SUCCESS: Tag database functions are working.");
  } catch (error) {
    console.error("FAILURE: Tag database functions error:", error);
    process.exit(1);
  }
}

testTags();
