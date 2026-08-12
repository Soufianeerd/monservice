CREATE TABLE "archived_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"document_id" text NOT NULL,
	"document_type" text,
	"organization_id" text NOT NULL,
	"retention_date" timestamp NOT NULL,
	"archived_at" timestamp DEFAULT now(),
	"anonymized" boolean DEFAULT false,
	"expiration_status" text,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "retention_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"country" text NOT NULL,
	"years" integer NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "archived_documents" ADD CONSTRAINT "archived_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;