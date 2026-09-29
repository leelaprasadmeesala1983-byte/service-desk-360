import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const settingsRes = await pool.query("SELECT * FROM quick_cash_settings");
console.log("QUICK CASH SETTINGS:");
console.table(settingsRes.rows);

const registerRes = await pool.query("SELECT * FROM daily_cash_register");
console.log("DAILY CASH REGISTER:");
console.table(registerRes.rows);

const txRes = await pool.query(
  "SELECT id, type, amount, created_by_id, customer_name, created_at FROM cash_transaction",
);
console.log("CASH TRANSACTIONS:");
console.table(txRes.rows);

await pool.end();
