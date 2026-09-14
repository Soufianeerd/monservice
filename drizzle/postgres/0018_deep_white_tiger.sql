CREATE TABLE "appointment_reminder_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"appointment_id" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"offset_minutes" integer NOT NULL,
	"recipient_email_hash" text,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text NOT NULL,
	"provider_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_reminders_channel_check" CHECK ("appointment_reminder_deliveries"."channel" = 'email'),
	CONSTRAINT "appointment_reminders_status_check" CHECK ("appointment_reminder_deliveries"."status" IN ('sent', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "patient_billing_links" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"client_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_portal_access" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_type" text NOT NULL,
	"representative_id" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_portal_access_type_check" CHECK ("patient_portal_access"."access_type" IN ('patient', 'representative')),
	CONSTRAINT "patient_portal_access_type_representative_check" CHECK (("patient_portal_access"."access_type" = 'patient' AND "patient_portal_access"."representative_id" IS NULL) OR ("patient_portal_access"."access_type" = 'representative' AND "patient_portal_access"."representative_id" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "patient_questionnaire_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"practitioner_id" text NOT NULL,
	"template_id" text NOT NULL,
	"care_episode_id" text,
	"status" text DEFAULT 'assigned' NOT NULL,
	"answers_json" jsonb DEFAULT '{}' NOT NULL,
	"due_at" timestamp with time zone,
	"submitted_at" timestamp with time zone,
	"clinical_response_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_questionnaires_status_check" CHECK ("patient_questionnaire_assignments"."status" IN ('assigned', 'submitted', 'cancelled')),
	CONSTRAINT "patient_questionnaires_submission_check" CHECK (("patient_questionnaire_assignments"."status" = 'submitted' AND "patient_questionnaire_assignments"."submitted_at" IS NOT NULL AND "patient_questionnaire_assignments"."clinical_response_id" IS NOT NULL) OR ("patient_questionnaire_assignments"."status" != 'submitted'))
);
--> statement-breakpoint
ALTER TABLE "clinical_documents" ADD COLUMN IF NOT EXISTS "patient_visible" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "patient_id" text;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "clients_id_org_unique" ON "clients" USING btree ("id","organization_id");--> statement-breakpoint
ALTER TABLE "appointment_reminder_deliveries" ADD CONSTRAINT "appointment_reminder_deliveries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_reminder_deliveries" ADD CONSTRAINT "appointment_reminders_appointment_fk" FOREIGN KEY ("appointment_id","organization_id") REFERENCES "public"."appointments"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_billing_links" ADD CONSTRAINT "patient_billing_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_billing_links" ADD CONSTRAINT "patient_billing_links_patient_fk" FOREIGN KEY ("patient_id","organization_id") REFERENCES "public"."patient_profiles"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_billing_links" ADD CONSTRAINT "patient_billing_links_client_fk" FOREIGN KEY ("client_id","organization_id") REFERENCES "public"."clients"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_access" ADD CONSTRAINT "patient_portal_access_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_access" ADD CONSTRAINT "patient_portal_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_access" ADD CONSTRAINT "patient_portal_access_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_access" ADD CONSTRAINT "patient_portal_access_patient_fk" FOREIGN KEY ("patient_id","organization_id") REFERENCES "public"."patient_profiles"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_access" ADD CONSTRAINT "patient_portal_access_representative_fk" FOREIGN KEY ("representative_id","organization_id") REFERENCES "public"."patient_representatives"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_portal_access" ADD CONSTRAINT "patient_portal_access_rep_link_fk" FOREIGN KEY ("organization_id","patient_id","representative_id") REFERENCES "public"."patient_representative_links"("organization_id","patient_id","representative_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_questionnaire_assignments" ADD CONSTRAINT "patient_questionnaire_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_questionnaire_assignments" ADD CONSTRAINT "patient_questionnaires_patient_fk" FOREIGN KEY ("patient_id","organization_id") REFERENCES "public"."patient_profiles"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_questionnaire_assignments" ADD CONSTRAINT "patient_questionnaires_practitioner_fk" FOREIGN KEY ("practitioner_id","organization_id") REFERENCES "public"."practice_practitioners"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_questionnaire_assignments" ADD CONSTRAINT "patient_questionnaires_template_fk" FOREIGN KEY ("template_id","organization_id","practitioner_id") REFERENCES "public"."clinical_form_templates"("id","organization_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_questionnaire_assignments" ADD CONSTRAINT "patient_questionnaires_episode_fk" FOREIGN KEY ("care_episode_id","organization_id","patient_id","practitioner_id") REFERENCES "public"."care_episodes"("id","organization_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patient_questionnaire_assignments" ADD CONSTRAINT "patient_questionnaires_response_fk" FOREIGN KEY ("clinical_response_id","organization_id") REFERENCES "public"."clinical_form_responses"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appointment_reminders_delivery_unique" ON "appointment_reminder_deliveries" USING btree ("appointment_id","channel","offset_minutes");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_reminders_org_sent_idx" ON "appointment_reminder_deliveries" USING btree ("organization_id","sent_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_billing_links_org_patient_unique" ON "patient_billing_links" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_billing_links_org_client_idx" ON "patient_billing_links" USING btree ("organization_id","client_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_portal_access_user_idx" ON "patient_portal_access" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_portal_access_org_patient_idx" ON "patient_portal_access" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_portal_access_org_patient_user_unique" ON "patient_portal_access" USING btree ("organization_id","patient_id","user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_questionnaires_org_patient_idx" ON "patient_questionnaire_assignments" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_questionnaires_org_practitioner_idx" ON "patient_questionnaire_assignments" USING btree ("organization_id","practitioner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "patient_questionnaires_org_status_idx" ON "patient_questionnaire_assignments" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "patient_questionnaires_org_id_unique" ON "patient_questionnaire_assignments" USING btree ("id","organization_id");--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_patient_fk" FOREIGN KEY ("patient_id","organization_id") REFERENCES "public"."patient_profiles"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "messages_patient_id_idx" ON "messages" USING btree ("patient_id");--> statement-breakpoint

-- ==========================================
-- ROW LEVEL SECURITY & POLICIES (SESSION 14)
-- ==========================================

-- 1. patient_portal_access
ALTER TABLE "patient_portal_access" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY IF EXISTS "patient_portal_access_practitioner_all" ON "patient_portal_access";--> statement-breakpoint
CREATE POLICY "patient_portal_access_practitioner_all"
  ON "patient_portal_access"
  FOR ALL
  TO authenticated
  USING ("organization_id" = public.current_organization_id())
  WITH CHECK ("organization_id" = public.current_organization_id());--> statement-breakpoint

DROP POLICY IF EXISTS "patient_portal_access_user_select" ON "patient_portal_access";--> statement-breakpoint
CREATE POLICY "patient_portal_access_user_select"
  ON "patient_portal_access"
  FOR SELECT
  TO authenticated
  USING ("user_id" = auth.uid()::text AND "is_active" = true);--> statement-breakpoint

-- 2. patient_questionnaire_assignments
ALTER TABLE "patient_questionnaire_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY IF EXISTS "patient_questionnaires_practitioner_all" ON "patient_questionnaire_assignments";--> statement-breakpoint
CREATE POLICY "patient_questionnaires_practitioner_all"
  ON "patient_questionnaire_assignments"
  FOR ALL
  TO authenticated
  USING ("organization_id" = public.current_organization_id())
  WITH CHECK ("organization_id" = public.current_organization_id());--> statement-breakpoint

DROP POLICY IF EXISTS "patient_questionnaires_user_select" ON "patient_questionnaire_assignments";--> statement-breakpoint
CREATE POLICY "patient_questionnaires_user_select"
  ON "patient_questionnaire_assignments"
  FOR SELECT
  TO authenticated
  USING ("patient_id" IN (
    SELECT ppa.patient_id FROM public.patient_portal_access ppa
    WHERE ppa.user_id = auth.uid()::text AND ppa.is_active = true
  ));--> statement-breakpoint

DROP POLICY IF EXISTS "patient_questionnaires_user_update" ON "patient_questionnaire_assignments";--> statement-breakpoint
CREATE POLICY "patient_questionnaires_user_update"
  ON "patient_questionnaire_assignments"
  FOR UPDATE
  TO authenticated
  USING ("patient_id" IN (
    SELECT ppa.patient_id FROM public.patient_portal_access ppa
    WHERE ppa.user_id = auth.uid()::text AND ppa.is_active = true
  ))
  WITH CHECK ("patient_id" IN (
    SELECT ppa.patient_id FROM public.patient_portal_access ppa
    WHERE ppa.user_id = auth.uid()::text AND ppa.is_active = true
  ));--> statement-breakpoint

-- 3. patient_billing_links
ALTER TABLE "patient_billing_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY IF EXISTS "patient_billing_links_practitioner_all" ON "patient_billing_links";--> statement-breakpoint
CREATE POLICY "patient_billing_links_practitioner_all"
  ON "patient_billing_links"
  FOR ALL
  TO authenticated
  USING ("organization_id" = public.current_organization_id())
  WITH CHECK ("organization_id" = public.current_organization_id());--> statement-breakpoint

-- 4. appointment_reminder_deliveries (backend / service-role only)
ALTER TABLE "appointment_reminder_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- ==========================================
-- PRIVILEGES & STRICT GRANTS
-- ==========================================

REVOKE ALL PRIVILEGES ON TABLE "patient_portal_access" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "patient_questionnaire_assignments" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "patient_billing_links" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "appointment_reminder_deliveries" FROM PUBLIC, anon, authenticated;--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE "patient_portal_access" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "patient_questionnaire_assignments" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "patient_billing_links" TO authenticated;