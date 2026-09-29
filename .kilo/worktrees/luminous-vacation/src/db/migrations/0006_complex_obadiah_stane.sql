ALTER TABLE "installation" ADD COLUMN "payment_mode" text;--> statement-breakpoint
ALTER TABLE "installation" ADD COLUMN "payment_status" text;--> statement-breakpoint
ALTER TABLE "installation" ADD COLUMN "amount" numeric(12, 2);