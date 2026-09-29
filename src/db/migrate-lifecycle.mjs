import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Client } = pg;

async function run() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();
  console.log("Connected to DB");

  // 1. Add repair_status to asset if not exists
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'asset' AND column_name = 'repair_status'
      ) THEN
        ALTER TABLE "asset" ADD COLUMN "repair_status" text NOT NULL DEFAULT 'NOT_REQUIRED';
      END IF;
    END $$;
  `);
  console.log("Asset table updated");

  // 2. Add new columns to send_to_vendor if not exists
  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'send_to_vendor' AND column_name = 'asset_id'
      ) THEN
        ALTER TABLE "send_to_vendor" ADD COLUMN "asset_id" uuid REFERENCES "asset"("id") ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'send_to_vendor' AND column_name = 'repair_status'
      ) THEN
        ALTER TABLE "send_to_vendor" ADD COLUMN "repair_status" text NOT NULL DEFAULT 'UNDER_REPAIR';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'send_to_vendor' AND column_name = 'vendor_return_date'
      ) THEN
        ALTER TABLE "send_to_vendor" ADD COLUMN "vendor_return_date" timestamp;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'send_to_vendor' AND column_name = 'repair_remarks'
      ) THEN
        ALTER TABLE "send_to_vendor" ADD COLUMN "repair_remarks" text;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'send_to_vendor' AND column_name = 'return_docket_number'
      ) THEN
        ALTER TABLE "send_to_vendor" ADD COLUMN "return_docket_number" text;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'send_to_vendor' AND column_name = 'received_by_id'
      ) THEN
        ALTER TABLE "send_to_vendor" ADD COLUMN "received_by_id" text REFERENCES "user"("id") ON DELETE SET NULL;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'send_to_vendor' AND column_name = 'status'
      ) THEN
        ALTER TABLE "send_to_vendor" ADD COLUMN "status" text NOT NULL DEFAULT 'SENT_TO_VENDOR';
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'send_to_vendor' AND column_name = 'items'
      ) THEN
        ALTER TABLE "send_to_vendor" ADD COLUMN "items" jsonb NOT NULL DEFAULT '[]'::jsonb;
      END IF;
    END $$;
  `);
  console.log("Send to vendor table updated");

  // 3. Create customer_dispatch table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS "customer_dispatch" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "seq" serial NOT NULL,
      "asset_id" uuid NOT NULL REFERENCES "asset"("id") ON DELETE CASCADE,
      "customer_name" text NOT NULL,
      "customer_contact" text NOT NULL,
      "customer_address" text NOT NULL,
      "courier_name" text NOT NULL,
      "docket_awb_number" text NOT NULL,
      "dispatch_date" timestamp NOT NULL,
      "number_of_packages" integer NOT NULL DEFAULT 1,
      "dispatch_remarks" text NOT NULL DEFAULT '',
      "status" text NOT NULL DEFAULT 'DISPATCHED_TO_CUSTOMER',
      "delivery_remarks" text,
      "delivered_at" timestamp,
      "dispatched_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
      "created_at" timestamp NOT NULL DEFAULT now(),
      "updated_at" timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log("Customer dispatch table created/verified");

  // 4. Create asset_status_history table if not exists
  await client.query(`
    CREATE TABLE IF NOT EXISTS "asset_status_history" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "asset_id" uuid NOT NULL REFERENCES "asset"("id") ON DELETE CASCADE,
      "previous_status" text,
      "new_status" text NOT NULL,
      "previous_repair_status" text,
      "new_repair_status" text,
      "action" text NOT NULL,
      "remarks" text NOT NULL DEFAULT '',
      "performed_by_id" text REFERENCES "user"("id") ON DELETE SET NULL,
      "performed_at" timestamp NOT NULL DEFAULT now(),
      "related_vendor_dispatch_id" uuid REFERENCES "send_to_vendor"("id") ON DELETE SET NULL,
      "related_customer_dispatch_id" uuid REFERENCES "customer_dispatch"("id") ON DELETE SET NULL,
      "metadata" jsonb DEFAULT '{}'::jsonb,
      "created_at" timestamp NOT NULL DEFAULT now()
    );
  `);
  console.log("Asset status history table created/verified");

  // 5. Create indexes
  await client.query(`
    CREATE INDEX IF NOT EXISTS "asset_repair_status_idx" ON "asset" ("repair_status");
    CREATE INDEX IF NOT EXISTS "send_to_vendor_asset_id_idx" ON "send_to_vendor" ("asset_id");
    CREATE INDEX IF NOT EXISTS "send_to_vendor_status_idx" ON "send_to_vendor" ("status");
    CREATE INDEX IF NOT EXISTS "send_to_vendor_repair_status_idx" ON "send_to_vendor" ("repair_status");
    CREATE INDEX IF NOT EXISTS "customer_dispatch_asset_id_idx" ON "customer_dispatch" ("asset_id");
    CREATE INDEX IF NOT EXISTS "customer_dispatch_status_idx" ON "customer_dispatch" ("status");
    CREATE INDEX IF NOT EXISTS "asset_status_history_asset_id_idx" ON "asset_status_history" ("asset_id");
    CREATE INDEX IF NOT EXISTS "asset_status_history_action_idx" ON "asset_status_history" ("action");
    CREATE INDEX IF NOT EXISTS "asset_status_history_performed_at_idx" ON "asset_status_history" ("performed_at");
  `);
  console.log("Indexes created/verified");

  await client.end();
  console.log("Migration completed successfully");
}

run().catch(console.error);
