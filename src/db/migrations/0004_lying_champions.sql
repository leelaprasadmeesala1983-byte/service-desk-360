CREATE TABLE "quick_cash_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" numeric(12, 2),
	"description" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"updated_by" text
);
