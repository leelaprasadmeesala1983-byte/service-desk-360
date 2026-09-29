import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const res = await pool.query(
  'SELECT id, name, email, role, status, created_by_id, deleted_at FROM "user" ORDER BY role, name',
);
console.table(res.rows);
await pool.end();
