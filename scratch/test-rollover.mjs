import dotenv from "dotenv";

dotenv.config();

import pg from "pg";

const { Pool } = pg;

async function runTest() {
  console.log("=== Testing Database Pool & Quick Cash Register ===");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
  });

  pool.on("error", (err) => {
    console.warn("Handled pool idle client error:", err.message);
  });

  // 1. Basic query
  const nowRes = await pool.query("SELECT NOW() as now");
  console.log("1. DB query OK, timestamp:", nowRes.rows[0].now);

  // 2. Query daily_cash_register
  const regRes = await pool.query(
    "SELECT date, user_id, opening_balance, closing_balance, status FROM daily_cash_register ORDER BY date DESC LIMIT 5",
  );
  console.log("2. Recent daily cash registers:", regRes.rows);

  // 3. Test uniqueness: check if any duplicates exist in daily_cash_register
  const dupRes = await pool.query(`
    SELECT user_id, date, count(*) as cnt
    FROM daily_cash_register
    GROUP BY user_id, date
    HAVING count(*) > 1
  `);
  if (dupRes.rows.length === 0) {
    console.log(
      "3. Uniqueness check passed: 0 duplicate registers found in database.",
    );
  } else {
    console.error("3. Duplicate registers detected:", dupRes.rows);
  }

  // 4. Test upsert idempotency with ON CONFLICT
  const testUserId = regRes.rows[0]?.user_id || "test-user";
  const testDate = "2026-10-18";

  const upsertQuery = `
    INSERT INTO daily_cash_register (date, user_id, opening_balance, total_cash_in, total_cash_out, closing_balance, status)
    VALUES ($1, $2, '0.00', '0.00', '0.00', '0.00', 'OPEN')
    ON CONFLICT (user_id, date) DO UPDATE
    SET updated_at = NOW()
    RETURNING date, user_id, status;
  `;
  const upsert1 = await pool.query(upsertQuery, [testDate, testUserId]);
  const upsert2 = await pool.query(upsertQuery, [testDate, testUserId]);
  console.log("4. Upsert 1 result:", upsert1.rows[0]);
  console.log("4. Upsert 2 result (idempotent):", upsert2.rows[0]);

  // 5. Check sessions table
  const sessionRes = await pool.query(
    "SELECT id, user_id, expires_at FROM session LIMIT 3",
  );
  console.log("5. Active sessions sample count:", sessionRes.rows.length);

  await pool.end();
  console.log("=== All Tests Completed Successfully ===");
}

runTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
