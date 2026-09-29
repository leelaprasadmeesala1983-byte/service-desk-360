CREATE TABLE "send_to_vendor" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"seq" serial NOT NULL,
	"vendor_name" text NOT NULL,
	"contact_person" text NOT NULL,
	"phone_number" text NOT NULL,
	"address" text NOT NULL,
	"reason_for_repair" text NOT NULL,
	"remarks" text DEFAULT '' NOT NULL,
	"courier_name" text NOT NULL,
	"docket_awb_number" text NOT NULL,
	"booking_date" timestamp NOT NULL,
	"number_of_packages" integer DEFAULT 1 NOT NULL,
	"dispatch_remarks" text DEFAULT '' NOT NULL,
	"created_by_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "send_to_vendor" ADD CONSTRAINT "send_to_vendor_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "send_to_vendor_vendor_name_idx" ON "send_to_vendor" USING btree ("vendor_name");--> statement-breakpoint
CREATE INDEX "send_to_vendor_phone_number_idx" ON "send_to_vendor" USING btree ("phone_number");--> statement-breakpoint
CREATE INDEX "send_to_vendor_docket_awb_idx" ON "send_to_vendor" USING btree ("docket_awb_number");--> statement-breakpoint
CREATE INDEX "send_to_vendor_courier_name_idx" ON "send_to_vendor" USING btree ("courier_name");--> statement-breakpoint
CREATE INDEX "send_to_vendor_booking_date_idx" ON "send_to_vendor" USING btree ("booking_date");--> statement-breakpoint
CREATE INDEX "send_to_vendor_created_at_idx" ON "send_to_vendor" USING btree ("created_at");