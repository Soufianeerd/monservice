CREATE TABLE "breach_notifications" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"discovery_date" timestamp NOT NULL,
	"start_date" timestamp,
	"data_categories" text,
	"affected_individuals" integer,
	"risk_level" text,
	"corrective_actions" text,
	"notified_authority" boolean DEFAULT false,
	"notification_date" timestamp,
	"notified_individuals" boolean DEFAULT false,
	"status" text DEFAULT 'open',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "processing_activities" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"purpose" text NOT NULL,
	"data_categories" text,
	"legal_basis" text,
	"retention_period" text,
	"data_subjects" text,
	"transfers" text,
	"security_measures" text,
	"responsible" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "breach_notifications" ADD CONSTRAINT "breach_notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "processing_activities" ADD CONSTRAINT "processing_activities_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;