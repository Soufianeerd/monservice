CREATE TABLE "appointment_reminder_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"appointment_id" text NOT NULL,
	"channel" text DEFAULT 'email' NOT NULL,
	"offset_minutes" integer NOT NULL,
	"recipient_email_hash" text,
	"sent_at" timestamp with time zone,
	"status" text NOT NULL,
	"provider_message_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_reminders_channel_check" CHECK ("appointment_reminder_deliveries"."channel" = 'email'),
	CONSTRAINT "appointment_reminders_status_check" CHECK ("appointment_reminder_deliveries"."status" IN ('pending', 'sent', 'failed')),
	CONSTRAINT "appointment_reminders_sent_at_check" CHECK (("appointment_reminder_deliveries"."status" = 'sent' AND "appointment_reminder_deliveries"."sent_at" IS NOT NULL) OR ("appointment_reminder_deliveries"."status" IN ('pending', 'failed') AND "appointment_reminder_deliveries"."sent_at" IS NULL))
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
  USING ("organization_id" = public.current_organization_id() AND public.current_clinical_practitioner_id() IS NOT NULL)
  WITH CHECK ("organization_id" = public.current_organization_id() AND public.current_clinical_practitioner_id() IS NOT NULL);--> statement-breakpoint

DROP POLICY IF EXISTS "patient_portal_access_user_select" ON "patient_portal_access";--> statement-breakpoint
CREATE POLICY "patient_portal_access_user_select"
  ON "patient_portal_access"
  FOR SELECT
  TO authenticated
  USING (
    "user_id" = auth.uid()::text
    AND "is_active" = true
    AND EXISTS (
      SELECT 1 FROM public.users caller
      WHERE caller.id = auth.uid()::text
        AND caller.profile_type = 'client'
    )
  );--> statement-breakpoint

-- 2. patient_questionnaire_assignments
ALTER TABLE "patient_questionnaire_assignments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY IF EXISTS "patient_questionnaires_practitioner_all" ON "patient_questionnaire_assignments";--> statement-breakpoint
CREATE POLICY "patient_questionnaires_practitioner_all"
  ON "patient_questionnaire_assignments"
  FOR ALL
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id())
  WITH CHECK ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

DROP POLICY IF EXISTS "patient_questionnaires_user_select" ON "patient_questionnaire_assignments";--> statement-breakpoint
CREATE POLICY "patient_questionnaires_user_select"
  ON "patient_questionnaire_assignments"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users caller
      WHERE caller.id = auth.uid()::text
        AND caller.profile_type = 'client'
    )
    AND "patient_id" IN (
      SELECT ppa.patient_id FROM public.patient_portal_access ppa
      WHERE ppa.user_id = auth.uid()::text AND ppa.is_active = true
    )
  );--> statement-breakpoint

DROP POLICY IF EXISTS "patient_questionnaires_user_update" ON "patient_questionnaire_assignments";--> statement-breakpoint

-- 3. patient_billing_links
ALTER TABLE "patient_billing_links" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

DROP POLICY IF EXISTS "patient_billing_links_practitioner_all" ON "patient_billing_links";--> statement-breakpoint
CREATE POLICY "patient_billing_links_practitioner_all"
  ON "patient_billing_links"
  FOR ALL
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND public.current_clinical_practitioner_id() IS NOT NULL)
  WITH CHECK ("organization_id" = public.current_organization_id() AND public.current_clinical_practitioner_id() IS NOT NULL);--> statement-breakpoint

-- 4. appointment_reminder_deliveries (backend / service-role only)
ALTER TABLE "appointment_reminder_deliveries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- 5. messages (hardened for patient mode)
CREATE OR REPLACE FUNCTION public.has_patient_practitioner_relationship(
  p_organization_id text,
  p_patient_id text,
  p_practitioner_id text,
  p_require_active boolean DEFAULT false
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_require_active THEN
    RETURN EXISTS (
      SELECT 1 FROM public.care_episodes ce
      WHERE ce.organization_id = p_organization_id
        AND ce.patient_id = p_patient_id
        AND ce.practitioner_id = p_practitioner_id
        AND ce.status = 'active'
    );
  ELSE
    RETURN EXISTS (
      SELECT 1 FROM public.care_episodes ce
      WHERE ce.organization_id = p_organization_id
        AND ce.patient_id = p_patient_id
        AND ce.practitioner_id = p_practitioner_id
    );
  END IF;
END;
$$;--> statement-breakpoint

DROP FUNCTION IF EXISTS public.can_insert_patient_message(text, text, text);--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.can_insert_patient_message(
  p_sender_id text,
  p_receiver_id text,
  p_patient_id text,
  p_organization_id text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_practitioner_id text;
  v_org_id text;
BEGIN
  IF p_patient_id IS NULL THEN
    RETURN true;
  END IF;

  -- Case 1: Sender is a patient client sending to an active practitioner with an active care episode
  IF EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.id = p_sender_id AND u.profile_type = 'client'
  ) THEN
    RETURN EXISTS (
      SELECT 1 
      FROM public.patient_portal_access ppa
      JOIN public.practice_practitioners pp 
        ON pp.organization_id = ppa.organization_id 
       AND pp.user_id = p_receiver_id 
       AND pp.is_active = true
      JOIN public.care_episodes ce 
        ON ce.organization_id = ppa.organization_id 
       AND ce.patient_id = ppa.patient_id 
       AND ce.practitioner_id = pp.id 
       AND ce.status = 'active'
      WHERE ppa.user_id = p_sender_id
        AND ppa.patient_id = p_patient_id
        AND (p_organization_id IS NULL OR ppa.organization_id = p_organization_id)
        AND ppa.is_active = true
    );
  END IF;

  -- Case 2: Sender is an active clinical practitioner in the practice sending to a client patient with active portal access and active care episode
  v_practitioner_id := public.current_clinical_practitioner_id();
  IF v_practitioner_id IS NOT NULL THEN
    -- Verify sender user is the practitioner user
    IF NOT EXISTS (
      SELECT 1 FROM public.practice_practitioners pp
      WHERE pp.id = v_practitioner_id AND pp.user_id = p_sender_id AND pp.is_active = true
    ) THEN
      RETURN false;
    END IF;

    -- Verify receiver is a client user
    IF NOT EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = p_receiver_id AND u.profile_type = 'client'
    ) THEN
      RETURN false;
    END IF;

    v_org_id := COALESCE(p_organization_id, public.current_organization_id());

    RETURN EXISTS (
      SELECT 1 
      FROM public.patient_portal_access ppa
      JOIN public.care_episodes ce 
        ON ce.organization_id = ppa.organization_id 
       AND ce.patient_id = ppa.patient_id 
       AND ce.practitioner_id = v_practitioner_id 
       AND ce.status = 'active'
      WHERE ppa.user_id = p_receiver_id
        AND ppa.patient_id = p_patient_id
        AND (v_org_id IS NULL OR ppa.organization_id = v_org_id)
        AND ppa.is_active = true
    );
  END IF;

  RETURN false;
END;
$$;--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.enforce_patient_message_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.patient_id IS NOT NULL THEN
    IF NEW.id <> OLD.id
       OR NEW.organization_id <> OLD.organization_id
       OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.sender_id <> OLD.sender_id
       OR NEW.receiver_id <> OLD.receiver_id
       OR NEW.request_id IS DISTINCT FROM OLD.request_id
       OR NEW.content <> OLD.content
       OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Structural mutation is not allowed on patient messages'
        USING ERRCODE = '23514';
    END IF;

    -- Read state machine: true -> false is forbidden
    IF OLD.is_read = true AND NEW.is_read = false THEN
      RAISE EXCEPTION 'Read state cannot transition from true to false on patient messages'
        USING ERRCODE = '23514';
    END IF;

    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS messages_patient_mutation_guard ON public.messages;--> statement-breakpoint
CREATE TRIGGER messages_patient_mutation_guard
BEFORE UPDATE ON public.messages
FOR EACH ROW
EXECUTE FUNCTION public.enforce_patient_message_update();--> statement-breakpoint

DROP POLICY IF EXISTS "messages_participants_only" ON "messages";--> statement-breakpoint
DROP POLICY IF EXISTS "messages_select_policy" ON "messages";--> statement-breakpoint
CREATE POLICY "messages_select_policy"
  ON "messages"
  FOR SELECT
  TO authenticated
  USING (
    (
      "patient_id" IS NULL AND (
        "sender_id" = auth.uid()::text OR "receiver_id" = auth.uid()::text
      )
    )
    OR
    (
      "patient_id" IS NOT NULL AND (
        -- Client participant branch
        (
          ("sender_id" = auth.uid()::text OR "receiver_id" = auth.uid()::text)
          AND EXISTS (
            SELECT 1 FROM public.users u
            JOIN public.patient_portal_access ppa 
              ON ppa.user_id = u.id 
             AND ppa.patient_id = "messages"."patient_id" 
             AND ppa.organization_id = "messages"."organization_id"
             AND ppa.is_active = true
            WHERE u.id = auth.uid()::text AND u.profile_type = 'client'
          )
        )
        OR
        -- Practitioner participant branch
        (
          ("sender_id" = auth.uid()::text OR "receiver_id" = auth.uid()::text)
          AND EXISTS (
            SELECT 1 FROM public.practice_practitioners pp
            JOIN public.care_episodes ce 
              ON ce.organization_id = "messages"."organization_id"
             AND ce.patient_id = "messages"."patient_id"
             AND ce.practitioner_id = pp.id
            WHERE pp.user_id = auth.uid()::text
              AND pp.id = public.current_clinical_practitioner_id()
              AND pp.is_active = true
          )
        )
      )
    )
  );--> statement-breakpoint

DROP POLICY IF EXISTS "messages_insert_policy" ON "messages";--> statement-breakpoint
CREATE POLICY "messages_insert_policy"
  ON "messages"
  FOR INSERT
  TO authenticated
  WITH CHECK (
    "sender_id" = auth.uid()::text AND
    public.can_insert_patient_message("sender_id", "receiver_id", "patient_id", "organization_id")
  );--> statement-breakpoint

DROP POLICY IF EXISTS "messages_update_policy" ON "messages";--> statement-breakpoint
CREATE POLICY "messages_update_policy"
  ON "messages"
  FOR UPDATE
  TO authenticated
  USING (
    (
      "patient_id" IS NULL AND (
        "sender_id" = auth.uid()::text OR "receiver_id" = auth.uid()::text
      )
    )
    OR
    (
      "patient_id" IS NOT NULL AND "receiver_id" = auth.uid()::text AND (
        -- Receiver client branch
        EXISTS (
          SELECT 1 FROM public.users u
          JOIN public.patient_portal_access ppa 
            ON ppa.user_id = u.id 
           AND ppa.patient_id = "messages"."patient_id" 
           AND ppa.organization_id = "messages"."organization_id"
           AND ppa.is_active = true
          WHERE u.id = auth.uid()::text AND u.profile_type = 'client'
        )
        OR
        -- Receiver practitioner branch
        EXISTS (
          SELECT 1 FROM public.practice_practitioners pp
          JOIN public.care_episodes ce 
            ON ce.organization_id = "messages"."organization_id"
           AND ce.patient_id = "messages"."patient_id"
           AND ce.practitioner_id = pp.id
          WHERE pp.user_id = auth.uid()::text
            AND pp.id = public.current_clinical_practitioner_id()
            AND pp.is_active = true
        )
      )
    )
  )
  WITH CHECK (
    (
      "patient_id" IS NULL AND (
        "sender_id" = auth.uid()::text OR "receiver_id" = auth.uid()::text
      )
    )
    OR
    (
      "patient_id" IS NOT NULL AND "receiver_id" = auth.uid()::text AND (
        -- Receiver client branch
        EXISTS (
          SELECT 1 FROM public.users u
          JOIN public.patient_portal_access ppa 
            ON ppa.user_id = u.id 
           AND ppa.patient_id = "messages"."patient_id" 
           AND ppa.organization_id = "messages"."organization_id"
           AND ppa.is_active = true
          WHERE u.id = auth.uid()::text AND u.profile_type = 'client'
        )
        OR
        -- Receiver practitioner branch
        EXISTS (
          SELECT 1 FROM public.practice_practitioners pp
          JOIN public.care_episodes ce 
            ON ce.organization_id = "messages"."organization_id"
           AND ce.patient_id = "messages"."patient_id"
           AND ce.practitioner_id = pp.id
          WHERE pp.user_id = auth.uid()::text
            AND pp.id = public.current_clinical_practitioner_id()
            AND pp.is_active = true
        )
      )
    )
  );--> statement-breakpoint

DROP POLICY IF EXISTS "messages_delete_policy" ON "messages";--> statement-breakpoint
CREATE POLICY "messages_delete_policy"
  ON "messages"
  FOR DELETE
  TO authenticated
  USING ("patient_id" IS NULL AND "sender_id" = auth.uid()::text);--> statement-breakpoint

-- ==========================================
-- PRIVILEGES & STRICT GRANTS
-- ==========================================

REVOKE ALL PRIVILEGES ON TABLE "patient_portal_access" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "patient_questionnaire_assignments" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "patient_billing_links" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "appointment_reminder_deliveries" FROM PUBLIC, anon, authenticated;--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE "patient_portal_access" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "patient_questionnaire_assignments" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "patient_billing_links" TO authenticated;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.has_patient_practitioner_relationship(text, text, text, boolean) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.has_patient_practitioner_relationship(text, text, text, boolean) TO authenticated;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.can_insert_patient_message(text, text, text, text) FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.can_insert_patient_message(text, text, text, text) TO authenticated;--> statement-breakpoint

REVOKE ALL ON FUNCTION public.enforce_patient_message_update() FROM PUBLIC, anon, authenticated;