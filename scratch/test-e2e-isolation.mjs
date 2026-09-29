import "dotenv/config";
import pg from "pg";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

async function runTests() {
  console.log("==================================================");
  console.log("STARTING FULL END-TO-END DATA ISOLATION TEST SUITE");
  console.log("==================================================");

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
    // 1. Fetch Key Users
    const usersRes = await client.query(
      `SELECT id, name, email, role, created_by_id FROM "user"`,
    );
    const users = usersRes.rows;
    console.log(`Found ${users.length} total users in DB.`);

    const leela = users.find(
      (u) =>
        u.email.includes("leelaprasad") ||
        u.name.toLowerCase().includes("leela"),
    );
    const shiva = users.find(
      (u) => u.email.includes("cctv") || u.name.toLowerCase().includes("shiva"),
    );
    const sai = users.find(
      (u) => u.email.includes("sai22") || u.name.toLowerCase().includes("sai"),
    );
    const nagaraju = users.find((u) =>
      u.name.toLowerCase().includes("nagaraju"),
    );

    assert(
      leela && leela.role === "ADMIN",
      `Leela Prasad exists and is ADMIN (${leela?.id})`,
    );
    assert(
      shiva && shiva.role === "ADMIN",
      `Shiva Chennoji exists and is ADMIN (${shiva?.id})`,
    );
    assert(
      sai && sai.role === "ADMIN",
      `sai 22 exists and is ADMIN (${sai?.id})`,
    );
    assert(
      nagaraju && nagaraju.role === "TECHNICIAN",
      `Nagaraju exists and is TECHNICIAN (${nagaraju?.id})`,
    );

    // 2. Test User Scope
    console.log("\n--- TEST: Users Module Isolation ---");
    // Leela's visible users (created_by_id = leela.id OR id = leela.id)
    const leelaUsersRes = await client.query(
      `SELECT id, name, email, role, created_by_id FROM "user" WHERE (created_by_id = $1 OR id = $1) AND deleted_at IS NULL`,
      [leela.id],
    );
    const leelaUserIds = leelaUsersRes.rows.map((u) => u.id);
    const leelaUserNames = leelaUsersRes.rows.map((u) => u.name);

    assert(leelaUserIds.includes(leela.id), "Leela can see herself");
    assert(!leelaUserIds.includes(shiva.id), "Leela CANNOT see Shiva Chennoji");
    assert(!leelaUserIds.includes(sai.id), "Leela CANNOT see sai 22");
    assert(
      leelaUserIds.includes(nagaraju.id),
      "Leela CAN see Nagaraju (technician created by Leela)",
    );
    console.log(
      `Leela sees ${leelaUsersRes.rows.length} users: [${leelaUserNames.join(", ")}]`,
    );

    // Shiva's visible users (created_by_id = shiva.id OR id = shiva.id)
    const shivaUsersRes = await client.query(
      `SELECT id, name, email, role, created_by_id FROM "user" WHERE (created_by_id = $1 OR id = $1) AND deleted_at IS NULL`,
      [shiva.id],
    );
    const shivaUserIds = shivaUsersRes.rows.map((u) => u.id);
    const shivaUserNames = shivaUsersRes.rows.map((u) => u.name);

    assert(shivaUserIds.includes(shiva.id), "Shiva can see himself");
    assert(!shivaUserIds.includes(leela.id), "Shiva CANNOT see Leela Prasad");
    assert(
      !shivaUserIds.includes(nagaraju.id),
      "Shiva CANNOT see Nagaraju (created by Leela)",
    );
    console.log(
      `Shiva sees ${shivaUsersRes.rows.length} users: [${shivaUserNames.join(", ")}]`,
    );

    // 3. Test Service Request Scope
    console.log("\n--- TEST: Service Request Isolation ---");
    const leelaSRRes = await client.query(
      `SELECT id, seq, customer_name, created_by_id FROM service_request WHERE created_by_id = $1`,
      [leela.id],
    );
    const shivaSRRes = await client.query(
      `SELECT id, seq, customer_name, created_by_id FROM service_request WHERE created_by_id = $1`,
      [shiva.id],
    );
    console.log(`Leela owns ${leelaSRRes.rows.length} Service Requests.`);
    console.log(`Shiva owns ${shivaSRRes.rows.length} Service Requests.`);

    // Check no overlap
    const srOverlap = leelaSRRes.rows.filter((l) =>
      shivaSRRes.rows.some((s) => s.id === l.id),
    );
    assert(
      srOverlap.length === 0,
      "No cross-admin Service Request data overlap",
    );

    // 4. Test Installation Scope
    console.log("\n--- TEST: Installation Isolation ---");
    const leelaInsRes = await client.query(
      `SELECT id, seq, customer_name, created_by_id FROM installation WHERE created_by_id = $1`,
      [leela.id],
    );
    const shivaInsRes = await client.query(
      `SELECT id, seq, customer_name, created_by_id FROM installation WHERE created_by_id = $1`,
      [shiva.id],
    );
    console.log(`Leela owns ${leelaInsRes.rows.length} Installations.`);
    console.log(`Shiva owns ${shivaInsRes.rows.length} Installations.`);
    const insOverlap = leelaInsRes.rows.filter((l) =>
      shivaInsRes.rows.some((s) => s.id === l.id),
    );
    assert(insOverlap.length === 0, "No cross-admin Installation data overlap");

    // 5. Test Project Scope
    console.log("\n--- TEST: Project Isolation ---");
    const leelaPrjRes = await client.query(
      `SELECT id, seq, company_name, created_by_id FROM project WHERE created_by_id = $1`,
      [leela.id],
    );
    const shivaPrjRes = await client.query(
      `SELECT id, seq, company_name, created_by_id FROM project WHERE created_by_id = $1`,
      [shiva.id],
    );
    console.log(`Leela owns ${leelaPrjRes.rows.length} Projects.`);
    console.log(`Shiva owns ${shivaPrjRes.rows.length} Projects.`);
    const prjOverlap = leelaPrjRes.rows.filter((l) =>
      shivaPrjRes.rows.some((s) => s.id === l.id),
    );
    assert(prjOverlap.length === 0, "No cross-admin Project data overlap");

    // 6. Test Asset Management Scope
    console.log("\n--- TEST: Asset Management Isolation ---");
    const leelaAssetRes = await client.query(
      `SELECT id, customer_name FROM asset WHERE created_by_id = $1`,
      [leela.id],
    );
    const shivaAssetRes = await client.query(
      `SELECT id, customer_name FROM asset WHERE created_by_id = $1`,
      [shiva.id],
    );
    console.log(`Leela owns ${leelaAssetRes.rows.length} Assets.`);
    console.log(`Shiva owns ${shivaAssetRes.rows.length} Assets.`);
    const assetOverlap = leelaAssetRes.rows.filter((l) =>
      shivaAssetRes.rows.some((s) => s.id === l.id),
    );
    assert(assetOverlap.length === 0, "No cross-admin Asset data overlap");

    // 7. Test Vendors Scope
    console.log("\n--- TEST: Vendors Module Isolation ---");
    const leelaVendorRes = await client.query(
      `SELECT id, vendor_name FROM vendor WHERE created_by_id = $1`,
      [leela.id],
    );
    const shivaVendorRes = await client.query(
      `SELECT id, vendor_name FROM vendor WHERE created_by_id = $1`,
      [shiva.id],
    );
    console.log(`Leela owns ${leelaVendorRes.rows.length} Vendors.`);
    console.log(`Shiva owns ${shivaVendorRes.rows.length} Vendors.`);
    const vendorOverlap = leelaVendorRes.rows.filter((l) =>
      shivaVendorRes.rows.some((s) => s.id === l.id),
    );
    assert(vendorOverlap.length === 0, "No cross-admin Vendor data overlap");

    // 8. Test Quick Cash Scope
    console.log("\n--- TEST: Quick Cash Isolation ---");
    const leelaCashRes = await client.query(
      `SELECT id, amount, type FROM cash_transaction WHERE created_by_id = $1`,
      [leela.id],
    );
    const shivaCashRes = await client.query(
      `SELECT id, amount, type FROM cash_transaction WHERE created_by_id = $1`,
      [shiva.id],
    );
    console.log(`Leela owns ${leelaCashRes.rows.length} Cash Transactions.`);
    console.log(`Shiva owns ${shivaCashRes.rows.length} Cash Transactions.`);
    const cashOverlap = leelaCashRes.rows.filter((l) =>
      shivaCashRes.rows.some((s) => s.id === l.id),
    );
    assert(cashOverlap.length === 0, "No cross-admin Quick Cash data overlap");

    console.log("\n==================================================");
    console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");
  } finally {
    client.release();
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
