import mysql from 'mysql2/promise';

async function check() {
  const connection = await mysql.createConnection(
    'mysql://4UWLuDR215YJ1TN.root:jdSxz7HPXYhy1nKF@gateway01.us-east-1.prod.aws.tidbcloud.com:4000/test?ssl={"rejectUnauthorized":true}'
  );

  console.log("Connected to TiDB!");

  const [rows] = await connection.execute(`DESCRIBE users`);
  console.log("Colunas da tabela users:");
  console.table(rows);

  await connection.end();
}

check().catch(console.error);
