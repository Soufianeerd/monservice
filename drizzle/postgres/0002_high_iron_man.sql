ALTER TABLE "clients" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "recipient_user_id" text;--> statement-breakpoint
CREATE INDEX "clients_user_id_idx" ON "clients" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "invoices_recipient_user_id_idx" ON "invoices" USING btree ("recipient_user_id");