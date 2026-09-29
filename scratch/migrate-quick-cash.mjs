import "dotenv/config";
import pg from "pg";

async function migrateQuickCash() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    console.log("Migrating quick_cash_settings...");
    // 1. Fetch existing 'opening_balance'
    const res = await client.query(
      `SELECT * FROM quick_cash_settings WHERE key = 'opening_balance'`,
    );
    if (res.rows.length > 0) {
      const row = res.rows[0];
      const adminId = row.updated_by || "e7d12a58-e21a-47b6-b1ef-76db6217128c";
      const userKey = `opening_balance_${adminId}`;

      // Insert or update user-specific key
      await client.query(
        `
        INSERT INTO quick_cash_settings (key, value, description, updated_by, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
      `,
        [
          userKey,
          row.value,
          `Daily opening balance for user ${adminId}`,
          adminId,
        ],
      );

      // Set global key to 0.00
      await client.query(
        `UPDATE quick_cash_settings SET value = '0.00' WHERE key = 'opening_balance'`,
      );
      console.log(`Migrated opening balance ${row.value} to ${userKey}`);
    }

    // 2. Also ensure Leela has opening_balance in daily_cash_register for today if needed
    const leelaId = "e7d12a58-e21a-47b6-b1ef-76db6217128c";
    const todayStr = "2026-09-29";
    await client.query(
      `
      INSERT INTO daily_cash_register (date, user_id, opening_balance, total_cash_in, total_cash_out, closing_balance, status, created_at, updated_at)
      VALUES ($1, $2, '3000.00', '0.00', '0.00', '3000.00', 'OPEN', NOW(), NOW())
      ON CONFLICT (user_id, date) DO UPDATE SET opening_balance = '3000.00', closing_balance = '3000.00', updated_at = NOW()
    `,
      [todayStr, leelaId],
    );

    console.log("Migration finished successfully.");
  } finally {
    client.release();
    await pool.end();
  }
}

migrateQuickCash().catch(console.error);
