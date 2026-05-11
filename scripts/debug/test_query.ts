import mysql from 'mysql2/promise';

async function testQuery() {
  const c = await mysql.createConnection('mysql://root@localhost:3306/crm_prospect_vli');
  try {
    const [rows] = await c.query(
      'select `id`, `username`, `passwordHash`, `openId`, `name`, `email`, `loginMethod`, `role`, `createdAt`, `updatedAt`, `lastSignedIn`, `passwordResetToken`, `passwordResetExpires` from `users` where `username` = ? limit ?',
      ['saulovitti', 1]
    );
    console.log("Success! Rows:", rows);
  } catch (err: any) {
    console.error("SQL Error:", err.message);
    console.error("Code:", err.code);
  }
  await c.end();
}

testQuery();
