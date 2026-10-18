import dotenv from "dotenv";

dotenv.config();

import pg from "pg";

const { Client } = pg;

async function check() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name IN ('service_request', 'installation', 'project', 'customer')
    ORDER BY table_name, ordinal_position;
  `);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

check().catch(console.error);
