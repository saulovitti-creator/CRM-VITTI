import { getUserByUsername } from '../../server/db.js';

async function testDrizzle() {
  try {
    const user = await getUserByUsername('saulovitti');
    console.log("Success! user:", user);
  } catch (err) {
    console.error("Drizzle Error:", err);
  }
}

testDrizzle();
