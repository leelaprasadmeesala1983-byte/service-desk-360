import "dotenv/config";
import pg from "pg";
import {
  getDailyRegister,
  getMonthlySummary,
  getOpeningBalance,
  listCashTransactions,
  listDailyRegisters,
} from "../src/db/queries/cash-transactions.js";
import { setOpeningBalance } from "../src/db/queries/quick-cash-settings.js";

async function testQuickCashIsolation() {
  console.log("==================================================");
  console.log("STARTING QUICK CASH ISOLATION TESTS");
  console.log("==================================================");

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    const usersRes = await client.query(
      'SELECT id, name, email, role FROM "user"',
    );
    const users = usersRes.rows;

    const leela = users.find(
      (u) =>
        u.email.includes("leelaprasad") ||
        u.name.toLowerCase().includes("leela"),
    );
    const shiva = users.find(
      (u) => u.email.includes("cctv") || u.name.toLowerCase().includes("shiva"),
    );

    console.log(`Leela ID: ${leela.id}`);
    console.log(`Shiva ID: ${shiva.id}`);

    const todayStr = "2026-09-29";

    // 1. Test Leela Opening Balance & Register
    console.log("\n--- TEST 1: Leela Prasad Quick Cash ---");
    const leelaOpening = await getOpeningBalance(leela.id);
    const leelaRegister = await getDailyRegister(todayStr, leela.id);

    console.log(`Leela Opening Balance: ₹${leelaOpening}`);
    console.log(
      `Leela Today Register: Opening = ₹${leelaRegister.openingBalance}, Closing = ₹${leelaRegister.closingBalance}`,
    );

    assert(
      Number(leelaOpening) === 3000,
      `Leela opening balance is ₹3000 (got ₹${leelaOpening})`,
    );
    assert(
      Number(leelaRegister.openingBalance) === 3000,
      `Leela daily register opening is ₹3000 (got ₹${leelaRegister.openingBalance})`,
    );

    // 2. Test Shiva Opening Balance & Register (Initial Unconfigured State)
    console.log("\n--- TEST 2: Shiva Chennoji Quick Cash (Unconfigured) ---");
    const shivaOpening = await getOpeningBalance(shiva.id);
    const shivaRegister = await getDailyRegister(todayStr, shiva.id);

    console.log(`Shiva Opening Balance: ₹${shivaOpening}`);
    console.log(
      `Shiva Today Register: Opening = ₹${shivaRegister.openingBalance}, Closing = ₹${shivaRegister.closingBalance}`,
    );

    assert(
      Number(shivaOpening) === 0,
      `Shiva opening balance is ₹0 (got ₹${shivaOpening})`,
    );
    assert(
      Number(shivaRegister.openingBalance) === 0,
      `Shiva daily register opening is ₹0 (got ₹${shivaRegister.openingBalance})`,
    );
    assert(
      Number(shivaRegister.closingBalance) === 0,
      `Shiva daily register closing is ₹0 (got ₹${shivaRegister.closingBalance})`,
    );

    // 3. Test Shiva sets Opening Balance to ₹5000
    console.log("\n--- TEST 3: Shiva configures ₹5000 Opening Balance ---");
    await setOpeningBalance("5000.00", shiva.id);
    await client.query(
      `
      INSERT INTO daily_cash_register (date, user_id, opening_balance, total_cash_in, total_cash_out, closing_balance, status, created_at, updated_at)
      VALUES ($1, $2, '5000.00', '0.00', '0.00', '5000.00', 'OPEN', NOW(), NOW())
      ON CONFLICT (user_id, date) DO UPDATE SET opening_balance = '5000.00', closing_balance = '5000.00', updated_at = NOW()
    `,
      [todayStr, shiva.id],
    );

    const shivaUpdatedOpening = await getOpeningBalance(shiva.id);
    const shivaUpdatedRegister = await getDailyRegister(todayStr, shiva.id);

    console.log(`Shiva Updated Opening: ₹${shivaUpdatedOpening}`);
    console.log(
      `Shiva Updated Register Opening: ₹${shivaUpdatedRegister.openingBalance}`,
    );

    assert(
      Number(shivaUpdatedOpening) === 5000,
      `Shiva opening balance is now ₹5000 (got ₹${shivaUpdatedOpening})`,
    );
    assert(
      Number(shivaUpdatedRegister.openingBalance) === 5000,
      `Shiva daily register opening is now ₹5000`,
    );

    // 4. Verify Leela is unaffected by Shiva's change
    console.log("\n--- TEST 4: Verify Leela remains unaffected ---");
    const leelaRecheckOpening = await getOpeningBalance(leela.id);
    const leelaRecheckRegister = await getDailyRegister(todayStr, leela.id);

    console.log(`Leela Recheck Opening: ₹${leelaRecheckOpening}`);
    console.log(
      `Leela Recheck Register Opening: ₹${leelaRecheckRegister.openingBalance}`,
    );

    assert(
      Number(leelaRecheckOpening) === 3000,
      `Leela opening balance remains ₹3000 (got ₹${leelaRecheckOpening})`,
    );
    assert(
      Number(leelaRecheckRegister.openingBalance) === 3000,
      `Leela register remains ₹3000`,
    );

    // 5. Test Transactions Scoping
    console.log("\n--- TEST 5: Transactions Scoping ---");
    const leelaTx = await listCashTransactions({
      page: 1,
      limit: 10,
      userId: leela.id,
    });
    const shivaTx = await listCashTransactions({
      page: 1,
      limit: 10,
      userId: shiva.id,
    });

    console.log(`Leela Transactions: ${leelaTx.total}`);
    console.log(`Shiva Transactions: ${shivaTx.total}`);

    assert(leelaTx.total === 0, "Leela has 0 transactions");
    assert(shivaTx.total === 1, "Shiva has 1 transaction (hindu ₹1000)");

    // 6. Test Monthly Summary Scoping
    console.log("\n--- TEST 6: Monthly Summary Scoping ---");
    const leelaMonthly = await getMonthlySummary(2026, 9, {}, leela.id);
    const shivaMonthly = await getMonthlySummary(2026, 9, {}, shiva.id);

    console.log(`Leela Monthly Opening: ₹${leelaMonthly.openingBalance}`);
    console.log(`Shiva Monthly Opening: ₹${shivaMonthly.openingBalance}`);

    assert(
      Number(leelaMonthly.openingBalance) === 3000,
      `Leela monthly opening is ₹3000 (got ₹${leelaMonthly.openingBalance})`,
    );
    assert(
      Number(shivaMonthly.openingBalance) === 5000,
      `Shiva monthly opening is ₹5000 (got ₹${shivaMonthly.openingBalance})`,
    );

    // Reset Shiva opening balance back to 0.00 for clean state if needed, or keep configured
    console.log("\n==================================================");
    console.log(`QUICK CASH TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
  } finally {
    client.release();
    await pool.end();
    process.exit(failed > 0 ? 1 : 0);
  }
}

testQuickCashIsolation().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
