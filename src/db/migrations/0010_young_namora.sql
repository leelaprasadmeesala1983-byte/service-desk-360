ALTER TYPE "public"."service_category" ADD VALUE 'OTHER';--> statement-breakpoint
CREATE TABLE "customer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" text NOT NULL,
	"mobile_number" text NOT NULL,
	"email" text,
	"address" text NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vendor_name" text NOT NULL,
	"contact_person" text NOT NULL,
	"phone_number" text NOT NULL,
	"address" text NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
/* 
    Unfortunately in current drizzle-kit version we can't automatically get name for primary key.
    We are working on making it available!

    Meanwhile you can:
        1. Check pk name in your database, by running
            SELECT constraint_name FROM information_schema.table_constraints
            WHERE table_schema = 'public'
                AND table_name = 'daily_cash_register'
                AND constraint_type = 'PRIMARY KEY';
        2. Uncomment code below and paste pk name manually
        
    Hope to release this update as soon as possible
*/

-- ALTER TABLE "daily_cash_register" DROP CONSTRAINT "<constraint_name>";--> statement-breakpoint
ALTER TABLE "installation" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "project" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "service_request" ALTER COLUMN "issue_title" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "created_by_id" text;--> statement-breakpoint
ALTER TABLE "cash_transaction" ADD COLUMN "category" text;--> statement-breakpoint
ALTER TABLE "daily_cash_register" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "send_to_vendor" ADD COLUMN "vendor_id" uuid;--> statement-breakpoint
ALTER TABLE "send_to_vendor" ADD COLUMN "customer_received_at" timestamp;--> statement-breakpoint
ALTER TABLE "send_to_vendor" ADD COLUMN "workflow_stage" text DEFAULT 'SENT_TO_VENDOR' NOT NULL;--> statement-breakpoint
ALTER TABLE "service_request" ADD COLUMN "other_category" text;--> statement-breakpoint
ALTER TABLE "work_history" ADD COLUMN "is_initial" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "customer" ADD CONSTRAINT "customer_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor" ADD CONSTRAINT "vendor_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "customer_mobile_number_idx" ON "customer" USING btree ("mobile_number");--> statement-breakpoint
CREATE INDEX "customer_name_idx" ON "customer" USING btree ("customer_name");--> statement-breakpoint
CREATE INDEX "customer_email_idx" ON "customer" USING btree ("email");--> statement-breakpoint
CREATE INDEX "customer_created_at_idx" ON "customer" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "vendor_name_idx" ON "vendor" USING btree ("vendor_name");--> statement-breakpoint
CREATE INDEX "vendor_contact_person_idx" ON "vendor" USING btree ("contact_person");--> statement-breakpoint
CREATE INDEX "vendor_phone_number_idx" ON "vendor" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "vendor_created_at_idx" ON "vendor" USING btree ("created_at");--> statement-breakpoint
ALTER TABLE "daily_cash_register" ADD CONSTRAINT "daily_cash_register_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "send_to_vendor" ADD CONSTRAINT "send_to_vendor_vendor_id_vendor_id_fk" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendor"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_created_by_idx" ON "user" USING btree ("created_by_id");--> statement-breakpoint
CREATE UNIQUE INDEX "daily_cash_register_user_date_idx" ON "daily_cash_register" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "daily_cash_register_user_idx" ON "daily_cash_register" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "daily_cash_register_date_idx" ON "daily_cash_register" USING btree ("date");--> statement-breakpoint
CREATE INDEX "send_to_vendor_vendor_id_idx" ON "send_to_vendor" USING btree ("vendor_id");--> statement-breakpoint
CREATE INDEX "send_to_vendor_workflow_stage_idx" ON "send_to_vendor" USING btree ("workflow_stage");