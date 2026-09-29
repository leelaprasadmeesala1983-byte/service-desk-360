CREATE TYPE "public"."cash_transaction_type" AS ENUM('CASH_IN', 'CASH_OUT');--> statement-breakpoint
CREATE TABLE "cash_transaction" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" serial NOT NULL,
	"type" "cash_transaction_type" NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"description" text NOT NULL,
	"source_record_id" uuid,
	"source_record_type" text,
	"assigned_technician_id" text,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cash_transaction" ADD CONSTRAINT "cash_transaction_assigned_technician_id_user_id_fk" FOREIGN KEY ("assigned_technician_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cash_transaction" ADD CONSTRAINT "cash_transaction_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cash_transaction_type_idx" ON "cash_transaction" USING btree ("type");--> statement-breakpoint
CREATE INDEX "cash_transaction_source_idx" ON "cash_transaction" USING btree ("source_record_id","source_record_type");--> statement-breakpoint
CREATE INDEX "cash_transaction_created_at_idx" ON "cash_transaction" USING btree ("created_at");