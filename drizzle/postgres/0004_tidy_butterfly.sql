CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"organization_id" text,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text NOT NULL,
	"old_values" text,
	"new_values" text,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "consent_events" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"organization_id" text,
	"consent_type" text NOT NULL,
	"consent_value" text NOT NULL,
	"legal_basis" text,
	"source" text,
	"ip" text,
	"user_agent" text,
	"policy_version" text,
	"timestamp" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "country_compliance_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"country" text NOT NULL,
	"version" text NOT NULL,
	"effective_from" timestamp NOT NULL,
	"vat_standard" real NOT NULL,
	"vat_reduced" real,
	"vat_reduced_2" real,
	"vat_reduced_3" real,
	"retention_years" integer NOT NULL,
	"einvoice_mandatory" boolean DEFAULT false,
	"einvoice_format" text,
	"einvoice_network" text,
	"legal_mentions" text,
	"marketing_rule" text,
	"privacy_authority" text,
	"dpo_threshold" integer,
	"archiving_requirements" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "data_subject_requests" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"organization_id" text,
	"request_type" text NOT NULL,
	"status" text NOT NULL,
	"request_details" text,
	"response" text,
	"deadline" timestamp,
	"received_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"processed_by" text
);
--> statement-breakpoint
CREATE TABLE "legal_entities" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"legal_form" text,
	"country" text NOT NULL,
	"establishment_country" text,
	"registration_number" text,
	"vat_number" text,
	"vat_scheme" text,
	"address" text,
	"city" text,
	"postal_code" text,
	"phone" text,
	"email" text,
	"website" text,
	"representative" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "clients" ADD COLUMN "legal_entity_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "legal_entity_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "supplier_country" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "supplier_vat_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_country" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_vat_id" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "customer_type" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "vat_treatment" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "vat_rate" real;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "vat_exemption_code" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "reverse_charge" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "einvoice_required" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "einvoice_format" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "einvoice_profile" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "einvoice_network" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "structured_invoice_hash" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "structured_invoice_path" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "pdf_hash" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "pdf_path" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "locked_at" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "locked_by" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "retention_until" text;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "legal_rule_version" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "legal_entity_id" text;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "consent_events" ADD CONSTRAINT "consent_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_processed_by_users_id_fk" FOREIGN KEY ("processed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legal_entities" ADD CONSTRAINT "legal_entities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;