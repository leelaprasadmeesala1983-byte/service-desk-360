ALTER TABLE "cash_transaction" DROP CONSTRAINT "cash_transaction_created_by_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "cash_transaction" ADD COLUMN "customer_name" text;--> statement-breakpoint
ALTER TABLE "cash_transaction" ADD COLUMN "is_admin_entry" boolean DEFAULT false;