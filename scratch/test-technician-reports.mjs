import "dotenv/config";
import pg from "pg";
import {
  getMonthlyTechnicianSummary,
  getRecordTechnicianWorkReport,
  getTechnicianDetailedReport,
} from "../src/db/queries/technician-reports.js";
import { listAssignableTechnicians } from "../src/db/queries/users.js";

async function testTechnicianReports() {
  console.log("==================================================");
  console.log("STARTING TECHNICIAN REPORTS DATA ISOLATION TESTS");
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
      'SELECT id, name, email, role, status, created_by_id, deleted_at FROM "user"',
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
    const nagaraju = users.find((u) =>
      u.name.toLowerCase().includes("nagaraju"),
    );

    console.log(`Leela ID: ${leela.id}`);
    console.log(`Shiva ID: ${shiva.id}`);
    console.log(`Nagaraju ID: ${nagaraju.id}`);

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // 1. Test Leela Prasad Monthly Summary
    console.log("\n--- TEST 1: Leela Prasad Monthly Summary Report ---");
    const leelaReport = await getMonthlyTechnicianSummary({
      month: currentMonth,
      year: currentYear,
      viewer: { role: "ADMIN", id: leela.id },
    });

    console.log(
      `Leela Report Total Technicians: ${leelaReport.stats.totalTechnicians}`,
    );
    const leelaTechNames = leelaReport.technicians.map((t) => t.technicianName);
    console.log(`Leela Report Technicians: [${leelaTechNames.join(", ")}]`);

    assert(
      leelaReport.stats.totalTechnicians === 3,
      "Leela has 3 authorized technicians (Arun kumar, Nagaraju M, akhil m)",
    );
    assert(
      leelaTechNames.includes("Nagaraju M"),
      "Leela report includes Nagaraju M",
    );
    assert(
      leelaTechNames.includes("Arun kumar"),
      "Leela report includes Arun kumar",
    );
    assert(leelaTechNames.includes("akhil m"), "Leela report includes akhil m");
    assert(
      !leelaTechNames.some((n) => n.includes("deleted")),
      "Leela report DOES NOT include deleted users",
    );
    assert(
      !leelaTechNames.includes("Shiva Chennoji"),
      "Leela report DOES NOT include Shiva Chennoji",
    );
    assert(
      !leelaTechNames.includes("sh iva"),
      "Leela report DOES NOT include sh iva (deleted)",
    );

    // 2. Test Shiva Chennoji Monthly Summary
    console.log("\n--- TEST 2: Shiva Chennoji Monthly Summary Report ---");
    const shivaReport = await getMonthlyTechnicianSummary({
      month: currentMonth,
      year: currentYear,
      viewer: { role: "ADMIN", id: shiva.id },
    });

    console.log(
      `Shiva Report Total Technicians: ${shivaReport.stats.totalTechnicians}`,
    );
    console.log(
      `Shiva Report Technicians: [${shivaReport.technicians.map((t) => t.technicianName).join(", ")}]`,
    );

    assert(
      shivaReport.stats.totalTechnicians === 0,
      "Shiva has 0 technicians created",
    );
    assert(
      shivaReport.technicians.length === 0,
      "Shiva technician list is empty",
    );
    assert(
      shivaReport.stats.totalWorkedDays === 0,
      "Shiva total worked days is 0",
    );
    assert(
      !shivaReport.technicians.some((t) => t.technicianName === "Nagaraju M"),
      "Shiva CANNOT see Leela's technician Nagaraju M",
    );

    // 3. Test Assignable Technicians Dropdown for Leela vs Shiva
    console.log("\n--- TEST 3: Assignable Technicians Dropdown ---");
    const leelaDropdown = await listAssignableTechnicians({
      role: "ADMIN",
      id: leela.id,
    });
    const shivaDropdown = await listAssignableTechnicians({
      role: "ADMIN",
      id: shiva.id,
    });

    console.log(
      `Leela Dropdown (${leelaDropdown.length}): [${leelaDropdown.map((t) => t.name).join(", ")}]`,
    );
    console.log(
      `Shiva Dropdown (${shivaDropdown.length}): [${shivaDropdown.map((t) => t.name).join(", ")}]`,
    );

    assert(
      leelaDropdown.length === 3,
      "Leela dropdown contains exactly 3 technicians",
    );
    assert(shivaDropdown.length === 0, "Shiva dropdown contains 0 technicians");

    // 4. Test Detailed Report Scoping
    console.log("\n--- TEST 4: Detailed Report Scoping ---");
    const leelaDetailed = await getTechnicianDetailedReport({
      technicianId: nagaraju.id,
      month: currentMonth,
      year: currentYear,
      viewer: { role: "ADMIN", id: leela.id },
    });
    assert(
      leelaDetailed !== null && leelaDetailed.technician.name === "Nagaraju M",
      "Leela can view Nagaraju's detailed report",
    );

    const shivaDetailed = await getTechnicianDetailedReport({
      technicianId: nagaraju.id,
      month: currentMonth,
      year: currentYear,
      viewer: { role: "ADMIN", id: shiva.id },
    });
    assert(
      shivaDetailed === null,
      "Shiva is DENIED access to Nagaraju's detailed report",
    );

    // 5. Test Filters and Single Technician Selection
    console.log("\n--- TEST 5: Filter by specific technician ---");
    const leelaFilteredReport = await getMonthlyTechnicianSummary({
      month: currentMonth,
      year: currentYear,
      technicianId: nagaraju.id,
      viewer: { role: "ADMIN", id: leela.id },
    });
    assert(
      leelaFilteredReport.technicians.length === 1 &&
        leelaFilteredReport.technicians[0].technicianName === "Nagaraju M",
      "Filtered report returns only Nagaraju M for Leela",
    );

    const shivaUnauthorizedFiltered = await getMonthlyTechnicianSummary({
      month: currentMonth,
      year: currentYear,
      technicianId: nagaraju.id,
      viewer: { role: "ADMIN", id: shiva.id },
    });
    assert(
      shivaUnauthorizedFiltered.technicians.length === 0,
      "Shiva filtering by Nagaraju ID returns 0 technicians (unauthorized)",
    );

    console.log("\n==================================================");
    console.log(
      `TECHNICIAN REPORTS TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`,
    );
    console.log("==================================================");
  } finally {
    client.release();
    await pool.end();
  }
}

testTechnicianReports().catch((err) => {
  console.error("Test error:", err);
  process.exit(1);
});
