CREATE TABLE IF NOT EXISTS "asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" serial NOT NULL,
	"name" text NOT NULL,
	"customer_name" text NOT NULL,
	"customer_number" text NOT NULL,
	"location" text NOT NULL,
	"status" text DEFAULT 'Received' NOT NULL,
	"products" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset" ADD CONSTRAINT "asset_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_status_idx" ON "asset" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_customer_name_idx" ON "asset" USING btree ("customer_name");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_customer_number_idx" ON "asset" USING btree ("customer_number");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_created_at_idx" ON "asset" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "asset_status_created_idx" ON "asset" USING btree ("status","created_at");