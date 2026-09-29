import "dotenv/config";
import pg from "pg";
import {
  getAllFilteredCustomersForExport,
  getCustomer360Details,
  getCustomerReports,
} from "../src/db/queries/customer-reports.js";

async function testCustomerReports() {
  console.log("==================================================");
  console.log("STARTING CUSTOMER REPORTS DATA ISOLATION TESTS");
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

    // 1. Test Leela Customer Reports
    console.log("\n--- TEST 1: Leela Prasad Customer Reports ---");
    const leelaData = await getCustomerReports(
      {},
      { role: "ADMIN", id: leela.id },
    );
    const leelaCustomerNames = leelaData.customers.map((c) => c.customerName);
    console.log(`Leela Total Customers: ${leelaData.stats.totalCustomers}`);
    console.log(`Leela Customers: [${leelaCustomerNames.join(", ")}]`);

    assert(
      leelaData.stats.totalCustomers > 0,
      "Leela has customers from her service requests / installations",
    );
    assert(
      leelaData.stats.totalServices === 4,
      `Leela total services is 4 (got ${leelaData.stats.totalServices})`,
    );
    assert(
      leelaData.stats.totalInstallations === 1,
      `Leela total installations is 1 (got ${leelaData.stats.totalInstallations})`,
    );
    assert(
      leelaCustomerNames.some(
        (n) =>
          n.toLowerCase().includes("prasad") ||
          n.toLowerCase().includes("srinivasu"),
      ),
      "Leela can see her own customers",
    );

    // 2. Test Shiva Customer Reports
    console.log("\n--- TEST 2: Shiva Chennoji Customer Reports ---");
    const shivaData = await getCustomerReports(
      {},
      { role: "ADMIN", id: shiva.id },
    );
    const shivaCustomerNames = shivaData.customers.map((c) => c.customerName);
    console.log(`Shiva Total Customers: ${shivaData.stats.totalCustomers}`);
    console.log(`Shiva Total Services: ${shivaData.stats.totalServices}`);
    console.log(
      `Shiva Total Installations: ${shivaData.stats.totalInstallations}`,
    );
    console.log(`Shiva Customers: [${shivaCustomerNames.join(", ")}]`);

    assert(
      shivaData.stats.totalCustomers === 0,
      "Shiva has 0 service ticket customers",
    );
    assert(shivaData.stats.totalServices === 0, "Shiva has 0 services");
    assert(
      shivaData.stats.totalInstallations === 0,
      "Shiva has 0 installations",
    );
    assert(shivaData.stats.totalProjects === 0, "Shiva has 0 projects");
    assert(shivaData.customers.length === 0, "Shiva customer list is empty");
    assert(
      !shivaCustomerNames.some((n) => n.toLowerCase().includes("prasad")),
      "Shiva CANNOT see Leela customer 'prasad garu'",
    );
    assert(
      !shivaCustomerNames.some((n) => n.toLowerCase().includes("srinivasu")),
      "Shiva CANNOT see Leela customer 'srinivasu'",
    );
    assert(
      !shivaCustomerNames.some((n) => n.toLowerCase().includes("krishna")),
      "Shiva CANNOT see Leela customer 'Krishna garu'",
    );
    assert(
      !shivaCustomerNames.some((n) => n.toLowerCase().includes("meenakshi")),
      "Shiva CANNOT see Leela customer 'meenakshi matha'",
    );
    assert(
      !shivaCustomerNames.some((n) => n.toLowerCase().includes("isha")),
      "Shiva CANNOT see Leela customer 'Isha steels'",
    );

    // 3. Test Customer 360 Scoping
    console.log("\n--- TEST 3: Customer 360 Details Scoping ---");
    if (leelaData.customers.length > 0) {
      const leelaCustKey = leelaData.customers[0].id;
      const leela360 = await getCustomer360Details(leelaCustKey, {
        role: "ADMIN",
        id: leela.id,
      });
      assert(
        leela360 !== null,
        `Leela can view 360 profile for ${leelaData.customers[0].customerName}`,
      );

      const shiva360 = await getCustomer360Details(leelaCustKey, {
        role: "ADMIN",
        id: shiva.id,
      });
      assert(
        shiva360 === null,
        "Shiva is DENIED access to Leela's customer 360 profile",
      );
    }

    // 4. Test Export Scoping
    console.log("\n--- TEST 4: Export Scoping ---");
    const leelaExport = await getAllFilteredCustomersForExport(
      {},
      { role: "ADMIN", id: leela.id },
    );
    const shivaExport = await getAllFilteredCustomersForExport(
      {},
      { role: "ADMIN", id: shiva.id },
    );

    assert(
      leelaExport.length === leelaData.stats.totalCustomers,
      "Leela export matches Leela scoped count",
    );
    assert(shivaExport.length === 0, "Shiva export has 0 rows");

    console.log("\n==================================================");
    console.log(
      `CUSTOMER REPORTS TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`,
    );
    console.log("==================================================");
  } finally {
    client.release();
    await pool.end();
  }
}

testCustomerReports().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
