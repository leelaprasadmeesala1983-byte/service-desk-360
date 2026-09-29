import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Client } = pg;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log("Connected to DB for user isolation migration");

  // 1. Add user_id column to daily_cash_register if not exists
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'daily_cash_register' AND column_name = 'user_id'
      ) THEN
        ALTER TABLE "daily_cash_register" ADD COLUMN "user_id" text REFERENCES "user"("id") ON DELETE CASCADE;
      END IF;
    END $$;
  `);
  console.log("Added user_id column to daily_cash_register");

  // 2. Backfill user_id in daily_cash_register for existing rows
  await client.query(`
    UPDATE "daily_cash_register" 
    SET "user_id" = COALESCE("closed_by_id", (SELECT id FROM "user" WHERE role = 'ADMIN' ORDER BY created_at ASC LIMIT 1))
    WHERE "user_id" IS NULL;
  `);
  console.log("Backfilled daily_cash_register.user_id");

  // 3. Drop existing primary key on date if it exists, and make composite unique index on (user_id, date)
  await client.query(`
    DO $$
    BEGIN
      -- Drop old primary key on date alone if it exists
      IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'daily_cash_register_pkey'
      ) THEN
        ALTER TABLE "daily_cash_register" DROP CONSTRAINT "daily_cash_register_pkey";
      END IF;

      -- Create unique index on (user_id, date) if not exists
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'daily_cash_register' AND indexname = 'daily_cash_register_user_date_idx'
      ) THEN
        CREATE UNIQUE INDEX "daily_cash_register_user_date_idx" ON "daily_cash_register" ("user_id", "date");
      END IF;

      -- Create index on daily_cash_register.user_id if not exists
      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'daily_cash_register' AND indexname = 'daily_cash_register_user_idx'
      ) THEN
        CREATE INDEX "daily_cash_register_user_idx" ON "daily_cash_register" ("user_id");
      END IF;
    END $$;
  `);
  console.log(
    "Updated daily_cash_register constraints for multi-user isolation",
  );

  // 4. Backfill technician_work_log created_by_id if null
  await client.query(`
    -- From service_request
    UPDATE "technician_work_log" twl
    SET "created_by_id" = sr.created_by_id
    FROM "service_request" sr
    WHERE twl.work_type = 'SERVICE' 
      AND twl.reference_id = sr.id 
      AND twl.created_by_id IS NULL
      AND sr.created_by_id IS NOT NULL;

    -- From installation
    UPDATE "technician_work_log" twl
    SET "created_by_id" = ins.created_by_id
    FROM "installation" ins
    WHERE twl.work_type = 'INSTALLATION' 
      AND twl.reference_id = ins.id 
      AND twl.created_by_id IS NULL
      AND ins.created_by_id IS NOT NULL;

    -- From project
    UPDATE "technician_work_log" twl
    SET "created_by_id" = prj.created_by_id
    FROM "project" prj
    WHERE twl.work_type = 'PROJECT' 
      AND twl.reference_id = prj.id 
      AND twl.created_by_id IS NULL
      AND prj.created_by_id IS NOT NULL;

    -- Fallback for any remaining nulls
    UPDATE "technician_work_log"
    SET "created_by_id" = (SELECT id FROM "user" WHERE role = 'ADMIN' ORDER BY created_at ASC LIMIT 1)
    WHERE "created_by_id" IS NULL;
  `);
  console.log("Backfilled technician_work_log.created_by_id");

  // 5. Backfill any other records with null created_by_id to the primary admin
  const tables = [
    "service_request",
    "installation",
    "project",
    "asset",
    "send_to_vendor",
    "cash_transaction",
    "work_history",
    "vendor",
  ];

  for (const t of tables) {
    await client.query(`
      UPDATE "${t}"
      SET "created_by_id" = (SELECT id FROM "user" WHERE role = 'ADMIN' ORDER BY created_at ASC LIMIT 1)
      WHERE "created_by_id" IS NULL;
    `);
  }
  console.log("Backfilled any null created_by_id on transactional tables");

  // 6. Create performance indexes on created_by_id across all transactional tables
  await client.query(`
    CREATE INDEX IF NOT EXISTS "service_request_created_by_idx" ON "service_request" ("created_by_id");
    CREATE INDEX IF NOT EXISTS "installation_created_by_idx" ON "installation" ("created_by_id");
    CREATE INDEX IF NOT EXISTS "project_created_by_idx" ON "project" ("created_by_id");
    CREATE INDEX IF NOT EXISTS "asset_created_by_idx" ON "asset" ("created_by_id");
    CREATE INDEX IF NOT EXISTS "send_to_vendor_created_by_idx" ON "send_to_vendor" ("created_by_id");
    CREATE INDEX IF NOT EXISTS "cash_transaction_created_by_idx" ON "cash_transaction" ("created_by_id");
    CREATE INDEX IF NOT EXISTS "work_history_created_by_idx" ON "work_history" ("created_by_id");
    CREATE INDEX IF NOT EXISTS "technician_work_log_created_by_idx" ON "technician_work_log" ("created_by_id");
    CREATE INDEX IF NOT EXISTS "vendor_created_by_idx" ON "vendor" ("created_by_id");
  `);
  console.log("Created ownership performance indexes");

  // 7. Add created_by_id to "user" table if not exists
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user' AND column_name = 'created_by_id'
      ) THEN
        ALTER TABLE "user" ADD COLUMN "created_by_id" text REFERENCES "user"("id") ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE tablename = 'user' AND indexname = 'user_created_by_idx'
      ) THEN
        CREATE INDEX "user_created_by_idx" ON "user" ("created_by_id");
      END IF;
    END $$;
  `);
  console.log("Added created_by_id column and index to user table");

  // 8. Explicitly link technicians created by Leela Prasad based on system audit logs
  await client.query(`
    UPDATE "user"
    SET "created_by_id" = 'e7d12a58-e21a-47b6-b1ef-76db6217128c'
    WHERE "id" IN (
      '5e9fbaeb-e388-4950-bc94-b8e32f2069ff', -- Nagaraju M
      '6ec9f97f-fe90-4d23-8224-672e70f2be4e', -- akhil m
      '1680ff76-57e6-43fd-9230-3f50e24dd9a5'  -- Arun kumar
    );
  `);
  console.log("Linked verified technicians to creator admin (Leela Prasad)");

  await client.end();
  console.log("Migration completed successfully!");
}

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
