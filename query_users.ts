import mysql from 'mysql2/promise';

async function listUsers() {
  const connection = await mysql.createConnection(
    'mysql://4UWLuDR215YJ1TN.root:jdSxz7HPXYhy1nKF@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}'
  );

  try {
    const [rows] = await connection.execute('SELECT id, username, email, name, role, createdAt FROM users');
    console.log("Contas de usuário cadastradas no banco:");
    console.table(rows);
  } catch (error: any) {
    console.error("Erro ao consultar o banco:", error.message);
  } finally {
    await connection.end();
  }
}

listUsers();
