ALTER TABLE "invoices" ADD COLUMN "delivery_status" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "delivery_channel" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "delivery_tracking_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "delivery_response" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "delivery_attempts" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "delivery_sent_at" timestamp;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "delivery_last_attempt_at" timestamp;