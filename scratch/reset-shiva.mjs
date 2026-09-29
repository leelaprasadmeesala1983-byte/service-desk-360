import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const shivaId = "07be854f-4df7-4938-b683-39607eb3fb75";
await pool.query(`DELETE FROM quick_cash_settings WHERE key = $1`, [
  `opening_balance_${shivaId}`,
]);
await pool.query(
  `DELETE FROM daily_cash_register WHERE user_id = $1 AND date = $2`,
  [shivaId, "2026-09-29"],
);
console.log("Reset Shiva test registers.");
await pool.end();
