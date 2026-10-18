import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Client } = pg;

async function run() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const client = new Client({
    connectionString,
  });

  await client.connect();
  console.log("Connected to database for customer module migration");

  // 1. Create table and indexes if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS "customer" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "customer_name" text NOT NULL,
      "mobile_number" text NOT NULL,
      "email" text,
      "address" text NOT NULL,
      "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
      "created_at" timestamp DEFAULT now() NOT NULL,
      "updated_at" timestamp DEFAULT now() NOT NULL
    );

    CREATE UNIQUE INDEX IF NOT EXISTS "customer_mobile_number_idx" ON "customer" ("mobile_number");
    CREATE INDEX IF NOT EXISTS "customer_name_idx" ON "customer" ("customer_name");
    CREATE INDEX IF NOT EXISTS "customer_email_idx" ON "customer" ("email");
    CREATE INDEX IF NOT EXISTS "customer_created_at_idx" ON "customer" ("created_at");
  `);
  console.log("Table and indexes for customer created or verified.");

  // 2. Backfill existing customers from service_request, installation, and project
  const s = await client.query(`
    SELECT customer_name, phone as mobile_number, email, address, created_at, created_by_id 
    FROM service_request
    WHERE phone IS NOT NULL AND TRIM(phone) != ''
  `);

  const i = await client.query(`
    SELECT customer_name, contact_number as mobile_number, email, address, created_at, created_by_id 
    FROM installation
    WHERE contact_number IS NOT NULL AND TRIM(contact_number) != ''
  `);

  const p = await client.query(`
    SELECT customer_name, mobile_no as mobile_number, email, location as address, created_at, created_by_id 
    FROM project
    WHERE mobile_no IS NOT NULL AND TRIM(mobile_no) != ''
  `);

  const allRecords = [...s.rows, ...i.rows, ...p.rows];
  console.log(
    `Gathered ${allRecords.length} records across service, installation, and project.`,
  );

  // Consolidate distinct customers by mobile number
  const customerMap = new Map();
  for (const r of allRecords) {
    const rawMobile = (r.mobile_number || "").trim();
    if (!rawMobile) continue;

    const existing = customerMap.get(rawMobile);
    if (!existing) {
      customerMap.set(rawMobile, {
        customerName: (r.customer_name || "Customer").trim(),
        mobileNumber: rawMobile,
        email: r.email ? r.email.trim() : null,
        address: (r.address || "—").trim() || "—",
        createdAt: r.created_at || new Date(),
        createdById: r.created_by_id || null,
      });
    } else {
      if (!existing.email && r.email) {
        existing.email = r.email.trim();
      }
      if ((!existing.address || existing.address === "—") && r.address) {
        existing.address = r.address.trim();
      }
      if (
        r.created_at &&
        new Date(r.created_at) < new Date(existing.createdAt)
      ) {
        existing.createdAt = r.created_at;
      }
    }
  }

  console.log(
    `Found ${customerMap.size} unique customer phone numbers to backfill.`,
  );

  let insertedCount = 0;
  for (const cust of customerMap.values()) {
    const res = await client.query(
      `
      INSERT INTO "customer" ("customer_name", "mobile_number", "email", "address", "created_by_id", "created_at", "updated_at")
      VALUES ($1, $2, $3, $4, $5, $6, $6)
      ON CONFLICT ("mobile_number") DO UPDATE SET
        "customer_name" = EXCLUDED.customer_name,
        "email" = COALESCE("customer"."email", EXCLUDED.email),
        "address" = CASE WHEN "customer"."address" = '—' THEN EXCLUDED.address ELSE "customer"."address" END
      RETURNING "id";
      `,
      [
        cust.customerName,
        cust.mobileNumber,
        cust.email,
        cust.address,
        cust.createdById,
        cust.createdAt,
      ],
    );
    if (res.rowCount && res.rowCount > 0) {
      insertedCount++;
    }
  }

  console.log(
    `Successfully migrated and synced ${insertedCount} customer records.`,
  );

  const countRes = await client.query(`SELECT count(*) FROM "customer"`);
  console.log(`Total customers in database: ${countRes.rows[0].count}`);

  await client.end();
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
