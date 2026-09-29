CREATE TABLE "daily_cash_register" (
	"date" varchar(10) PRIMARY KEY NOT NULL,
	"opening_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_cash_in" numeric(12, 2) DEFAULT '0' NOT NULL,
	"total_cash_out" numeric(12, 2) DEFAULT '0' NOT NULL,
	"closing_balance" numeric(12, 2) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'OPEN' NOT NULL,
	"closed_at" timestamp,
	"closed_by_id" text,
	"closed_by_name" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "technician_work_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"technician_id" text NOT NULL,
	"work_type" "record_type" NOT NULL,
	"reference_id" uuid NOT NULL,
	"work_date" date NOT NULL,
	"notes" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "work_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"work_type" "record_type" DEFAULT 'SERVICE' NOT NULL,
	"reference_id" uuid NOT NULL,
	"technician_ids" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"work_date" date NOT NULL,
	"work_date_time" timestamp DEFAULT now() NOT NULL,
	"status" "record_status" DEFAULT 'IN_PROGRESS' NOT NULL,
	"description" text NOT NULL,
	"attachments" text[],
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "service_request" ALTER COLUMN "email" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "installation" ADD COLUMN "assigned_technician_ids" text[];--> statement-breakpoint
ALTER TABLE "project" ADD COLUMN "assigned_technician_ids" text[];--> statement-breakpoint
ALTER TABLE "service_request" ADD COLUMN "assigned_technician_ids" text[];--> statement-breakpoint
ALTER TABLE "technician_work_log" ADD CONSTRAINT "technician_work_log_technician_id_user_id_fk" FOREIGN KEY ("technician_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_work_log" ADD CONSTRAINT "technician_work_log_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_history" ADD CONSTRAINT "work_history_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "tech_work_log_unique_idx" ON "technician_work_log" USING btree ("technician_id","work_type","reference_id","work_date");--> statement-breakpoint
CREATE INDEX "tech_work_log_tech_date_idx" ON "technician_work_log" USING btree ("technician_id","work_date");--> statement-breakpoint
CREATE INDEX "tech_work_log_ref_idx" ON "technician_work_log" USING btree ("work_type","reference_id");--> statement-breakpoint
CREATE INDEX "tech_work_log_date_idx" ON "technician_work_log" USING btree ("work_date");--> statement-breakpoint
CREATE INDEX "work_history_ref_idx" ON "work_history" USING btree ("work_type","reference_id");--> statement-breakpoint
CREATE INDEX "work_history_date_idx" ON "work_history" USING btree ("work_date");--> statement-breakpoint
CREATE INDEX "work_history_created_at_idx" ON "work_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "work_history_status_idx" ON "work_history" USING btree ("status");