-- Brings databases built purely from migrations in line with the schema snapshot.
-- Earlier changes were applied with `db:push` and never captured in migration SQL.
-- Every statement is idempotent so it is safe on databases that already have them.

-- asset ------------------------------------------------------------------------
ALTER TABLE "asset" ADD COLUMN IF NOT EXISTS "repair_status" text DEFAULT 'NOT_REQUIRED' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_repair_status_idx" ON "asset" USING btree ("repair_status");--> statement-breakpoint

-- send_to_vendor ---------------------------------------------------------------
ALTER TABLE "send_to_vendor" ADD COLUMN IF NOT EXISTS "asset_id" uuid;--> statement-breakpoint
ALTER TABLE "send_to_vendor" ADD COLUMN IF NOT EXISTS "items" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "send_to_vendor" ADD COLUMN IF NOT EXISTS "repair_status" text DEFAULT 'UNDER_REPAIR' NOT NULL;--> statement-breakpoint
ALTER TABLE "send_to_vendor" ADD COLUMN IF NOT EXISTS "vendor_return_date" timestamp;--> statement-breakpoint
ALTER TABLE "send_to_vendor" ADD COLUMN IF NOT EXISTS "repair_remarks" text;--> statement-breakpoint
ALTER TABLE "send_to_vendor" ADD COLUMN IF NOT EXISTS "return_docket_number" text;--> statement-breakpoint
ALTER TABLE "send_to_vendor" ADD COLUMN IF NOT EXISTS "received_by_id" text;--> statement-breakpoint
ALTER TABLE "send_to_vendor" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'SENT_TO_VENDOR' NOT NULL;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "send_to_vendor_asset_id_idx" ON "send_to_vendor" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "send_to_vendor_status_idx" ON "send_to_vendor" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "send_to_vendor_repair_status_idx" ON "send_to_vendor" USING btree ("repair_status");--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "send_to_vendor" ADD CONSTRAINT "send_to_vendor_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "send_to_vendor" ADD CONSTRAINT "send_to_vendor_received_by_id_user_id_fk" FOREIGN KEY ("received_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint

-- customer_dispatch ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "customer_dispatch" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" serial NOT NULL,
	"asset_id" uuid NOT NULL,
	"customer_name" text NOT NULL,
	"customer_contact" text NOT NULL,
	"customer_address" text NOT NULL,
	"courier_name" text NOT NULL,
	"docket_awb_number" text NOT NULL,
	"dispatch_date" timestamp NOT NULL,
	"number_of_packages" integer DEFAULT 1 NOT NULL,
	"dispatch_remarks" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'DISPATCHED_TO_CUSTOMER' NOT NULL,
	"delivery_remarks" text,
	"delivered_at" timestamp,
	"dispatched_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer_dispatch" ADD CONSTRAINT "customer_dispatch_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "customer_dispatch" ADD CONSTRAINT "customer_dispatch_dispatched_by_id_user_id_fk" FOREIGN KEY ("dispatched_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_dispatch_asset_id_idx" ON "customer_dispatch" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_dispatch_status_idx" ON "customer_dispatch" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_dispatch_customer_name_idx" ON "customer_dispatch" USING btree ("customer_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_dispatch_docket_awb_idx" ON "customer_dispatch" USING btree ("docket_awb_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_dispatch_dispatch_date_idx" ON "customer_dispatch" USING btree ("dispatch_date");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "customer_dispatch_created_at_idx" ON "customer_dispatch" USING btree ("created_at");--> statement-breakpoint

-- asset_status_history ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS "asset_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"asset_id" uuid NOT NULL,
	"previous_status" text,
	"new_status" text NOT NULL,
	"previous_repair_status" text,
	"new_repair_status" text,
	"action" text NOT NULL,
	"remarks" text DEFAULT '' NOT NULL,
	"performed_by_id" text,
	"performed_at" timestamp DEFAULT now() NOT NULL,
	"related_vendor_dispatch_id" uuid,
	"related_customer_dispatch_id" uuid,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_asset_id_asset_id_fk" FOREIGN KEY ("asset_id") REFERENCES "public"."asset"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_performed_by_id_user_id_fk" FOREIGN KEY ("performed_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_related_vendor_dispatch_id_send_to_vendor_id_fk" FOREIGN KEY ("related_vendor_dispatch_id") REFERENCES "public"."send_to_vendor"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "asset_status_history" ADD CONSTRAINT "asset_status_history_related_customer_dispatch_id_customer_dispatch_id_fk" FOREIGN KEY ("related_customer_dispatch_id") REFERENCES "public"."customer_dispatch"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_status_history_asset_id_idx" ON "asset_status_history" USING btree ("asset_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_status_history_action_idx" ON "asset_status_history" USING btree ("action");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_status_history_performed_at_idx" ON "asset_status_history" USING btree ("performed_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_status_history_new_status_idx" ON "asset_status_history" USING btree ("new_status");--> statement-breakpoint

-- list-page indexes ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "installation_created_at_idx" ON "installation" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "installation_status_created_idx" ON "installation" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_created_at_idx" ON "project" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "project_status_created_idx" ON "project" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_request_created_at_idx" ON "service_request" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "service_request_status_created_idx" ON "service_request" USING btree ("status","created_at");
