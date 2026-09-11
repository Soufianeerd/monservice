CREATE TABLE "care_episodes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"practitioner_id" text NOT NULL,
	"title" text,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "care_episodes_status_check" CHECK ("care_episodes"."status" IN ('active', 'closed')),
	CONSTRAINT "care_episodes_status_metadata_check" CHECK (("care_episodes"."status" = 'active' AND "care_episodes"."closed_at" IS NULL) OR ("care_episodes"."status" = 'closed' AND "care_episodes"."closed_at" IS NOT NULL)),
	CONSTRAINT "care_episodes_title_length_check" CHECK ("care_episodes"."title" IS NULL OR (char_length(trim("care_episodes"."title")) >= 1 AND char_length("care_episodes"."title") <= 160))
);
--> statement-breakpoint
CREATE TABLE "clinical_encounters" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"care_episode_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"practitioner_id" text NOT NULL,
	"appointment_id" text,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clinical_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"encounter_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"author_practitioner_id" text NOT NULL,
	"content" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinical_notes_status_check" CHECK ("clinical_notes"."status" IN ('draft', 'finalized')),
	CONSTRAINT "clinical_notes_status_metadata_check" CHECK (("clinical_notes"."status" = 'draft' AND "clinical_notes"."finalized_at" IS NULL) OR ("clinical_notes"."status" = 'finalized' AND "clinical_notes"."finalized_at" IS NOT NULL)),
	CONSTRAINT "clinical_notes_content_length_check" CHECK (char_length(trim("clinical_notes"."content")) >= 1 AND char_length("clinical_notes"."content") <= 50000)
);
--> statement-breakpoint
-- Target unique indexes created FIRST before referencing foreign keys
CREATE UNIQUE INDEX "appointments_id_org_patient_practitioner_unique" ON "appointments" USING btree ("id","organization_id","patient_id","practitioner_id");--> statement-breakpoint
CREATE INDEX "care_episodes_organization_patient_idx" ON "care_episodes" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX "care_episodes_organization_practitioner_idx" ON "care_episodes" USING btree ("organization_id","practitioner_id");--> statement-breakpoint
CREATE INDEX "care_episodes_org_status_idx" ON "care_episodes" USING btree ("organization_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "care_episodes_org_id_unique" ON "care_episodes" USING btree ("id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "care_episodes_org_patient_practitioner_id_unique" ON "care_episodes" USING btree ("id","organization_id","patient_id","practitioner_id");--> statement-breakpoint
CREATE INDEX "clinical_encounters_org_patient_occurred_idx" ON "clinical_encounters" USING btree ("organization_id","patient_id","occurred_at");--> statement-breakpoint
CREATE INDEX "clinical_encounters_org_practitioner_occurred_idx" ON "clinical_encounters" USING btree ("organization_id","practitioner_id","occurred_at");--> statement-breakpoint
CREATE INDEX "clinical_encounters_org_episode_idx" ON "clinical_encounters" USING btree ("organization_id","care_episode_id");--> statement-breakpoint
CREATE INDEX "clinical_encounters_org_appointment_idx" ON "clinical_encounters" USING btree ("organization_id","appointment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_encounters_org_id_unique" ON "clinical_encounters" USING btree ("id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_encounters_org_patient_practitioner_id_unique" ON "clinical_encounters" USING btree ("id","organization_id","patient_id","practitioner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_encounters_org_appointment_unique" ON "clinical_encounters" USING btree ("organization_id","appointment_id") WHERE appointment_id IS NOT NULL;--> statement-breakpoint
CREATE INDEX "clinical_notes_org_patient_created_idx" ON "clinical_notes" USING btree ("organization_id","patient_id","created_at");--> statement-breakpoint
CREATE INDEX "clinical_notes_org_encounter_idx" ON "clinical_notes" USING btree ("organization_id","encounter_id");--> statement-breakpoint
CREATE INDEX "clinical_notes_org_author_idx" ON "clinical_notes" USING btree ("organization_id","author_practitioner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_notes_org_id_unique" ON "clinical_notes" USING btree ("id","organization_id");--> statement-breakpoint
-- Foreign keys added AFTER target unique indexes exist
ALTER TABLE "care_episodes" ADD CONSTRAINT "care_episodes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_episodes" ADD CONSTRAINT "care_episodes_patient_fk" FOREIGN KEY ("patient_id","organization_id") REFERENCES "public"."patient_profiles"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "care_episodes" ADD CONSTRAINT "care_episodes_practitioner_fk" FOREIGN KEY ("practitioner_id","organization_id") REFERENCES "public"."practice_practitioners"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_encounters" ADD CONSTRAINT "clinical_encounters_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_encounters" ADD CONSTRAINT "clinical_encounters_episode_fk" FOREIGN KEY ("care_episode_id","organization_id","patient_id","practitioner_id") REFERENCES "public"."care_episodes"("id","organization_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_encounters" ADD CONSTRAINT "clinical_encounters_appointment_fk" FOREIGN KEY ("appointment_id","organization_id","patient_id","practitioner_id") REFERENCES "public"."appointments"("id","organization_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_notes" ADD CONSTRAINT "clinical_notes_encounter_fk" FOREIGN KEY ("encounter_id","organization_id","patient_id","author_practitioner_id") REFERENCES "public"."clinical_encounters"("id","organization_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- Clinical authorization helper function
CREATE OR REPLACE FUNCTION public.current_clinical_practitioner_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT pp.id
  FROM public.practice_practitioners pp
  JOIN public.users u ON u.id = pp.user_id AND u.organization_id = pp.organization_id
  WHERE pp.user_id = auth.uid()::text
    AND pp.organization_id = public.current_organization_id()
    AND pp.is_active = true
    AND u.profile_type = 'professional'
  LIMIT 1;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.current_clinical_practitioner_id() FROM PUBLIC, anon;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.current_clinical_practitioner_id() TO authenticated;--> statement-breakpoint

-- Care episodes state machine & integrity trigger
CREATE OR REPLACE FUNCTION public.enforce_care_episode_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'active' OR NEW.closed_at IS NOT NULL THEN
      RAISE EXCEPTION 'Care episodes must be created as active without closed_at'
        USING ERRCODE = '23514';
    END IF;
    NEW.started_at := COALESCE(NEW.started_at, now());
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'closed' THEN
      RAISE EXCEPTION 'Closed care episodes cannot be mutated'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.practitioner_id IS DISTINCT FROM OLD.practitioner_id
       OR NEW.started_at IS DISTINCT FROM OLD.started_at
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Structural fields of care episode are immutable'
        USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'active' AND NEW.status = 'active' THEN
      IF NEW.closed_at IS NOT NULL THEN
        RAISE EXCEPTION 'Active care episode cannot have closed_at set'
          USING ERRCODE = '23514';
      END IF;
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    IF OLD.status = 'active' AND NEW.status = 'closed' THEN
      IF EXISTS (
        SELECT 1
        FROM public.clinical_encounters ce
        JOIN public.clinical_notes cn ON cn.encounter_id = ce.id AND cn.organization_id = ce.organization_id
        WHERE ce.care_episode_id = OLD.id
          AND ce.organization_id = OLD.organization_id
          AND cn.status = 'draft'
      ) THEN
        RAISE EXCEPTION 'Cannot close care episode with draft clinical notes'
          USING ERRCODE = '23514';
      END IF;
      NEW.closed_at := now();
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid care episode status transition'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER care_episodes_transition_trigger
  BEFORE INSERT OR UPDATE ON public.care_episodes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_care_episode_transition();
--> statement-breakpoint

-- Clinical encounters insert validation trigger
CREATE OR REPLACE FUNCTION public.enforce_clinical_encounter_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ep_status text;
  v_appt_starts_at timestamptz;
  v_appt_status text;
BEGIN
  IF NEW.occurred_at > now() THEN
    RAISE EXCEPTION 'Clinical encounter cannot occur in the future'
      USING ERRCODE = '23514';
  END IF;

  SELECT status INTO v_ep_status
  FROM public.care_episodes
  WHERE id = NEW.care_episode_id
    AND organization_id = NEW.organization_id
    AND patient_id = NEW.patient_id
    AND practitioner_id = NEW.practitioner_id;

  IF v_ep_status IS NOT NULL AND v_ep_status != 'active' THEN
    RAISE EXCEPTION 'Cannot create encounter on a closed care episode'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.appointment_id IS NOT NULL THEN
    SELECT starts_at, status INTO v_appt_starts_at, v_appt_status
    FROM public.appointments
    WHERE id = NEW.appointment_id
      AND organization_id = NEW.organization_id
      AND patient_id = NEW.patient_id
      AND practitioner_id = NEW.practitioner_id;

    IF v_appt_status IS NOT NULL THEN
      IF v_appt_starts_at > now() THEN
        RAISE EXCEPTION 'Cannot link encounter to future appointment'
          USING ERRCODE = '23514';
      END IF;
      IF v_appt_status != 'scheduled' THEN
        RAISE EXCEPTION 'Cannot link encounter to non-scheduled appointment'
          USING ERRCODE = '23514';
      END IF;
    END IF;
  END IF;

  NEW.created_at := COALESCE(NEW.created_at, now());
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER clinical_encounters_insert_trigger
  BEFORE INSERT ON public.clinical_encounters
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_clinical_encounter_insert();
--> statement-breakpoint

-- Clinical notes state machine & integrity trigger
CREATE OR REPLACE FUNCTION public.enforce_clinical_note_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_ep_status text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'draft' OR NEW.finalized_at IS NOT NULL THEN
      RAISE EXCEPTION 'Clinical notes must be created as draft without finalized_at'
        USING ERRCODE = '23514';
    END IF;

    SELECT ep.status INTO v_ep_status
    FROM public.clinical_encounters ce
    JOIN public.care_episodes ep ON ep.id = ce.care_episode_id AND ep.organization_id = ce.organization_id
    WHERE ce.id = NEW.encounter_id
      AND ce.organization_id = NEW.organization_id;

    IF v_ep_status IS NOT NULL AND v_ep_status != 'active' THEN
      RAISE EXCEPTION 'Cannot create clinical note on encounter belonging to a closed care episode'
        USING ERRCODE = '23514';
    END IF;

    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'finalized' THEN
      RAISE EXCEPTION 'Finalized clinical notes are immutable'
        USING ERRCODE = '23514';
    END IF;

    IF NEW.id IS DISTINCT FROM OLD.id
       OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
       OR NEW.encounter_id IS DISTINCT FROM OLD.encounter_id
       OR NEW.patient_id IS DISTINCT FROM OLD.patient_id
       OR NEW.author_practitioner_id IS DISTINCT FROM OLD.author_practitioner_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Structural fields of clinical note are immutable'
        USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'draft' AND NEW.status = 'draft' THEN
      IF NEW.finalized_at IS NOT NULL THEN
        RAISE EXCEPTION 'Draft note cannot have finalized_at timestamp'
          USING ERRCODE = '23514';
      END IF;
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    IF OLD.status = 'draft' AND NEW.status = 'finalized' THEN
      NEW.finalized_at := now();
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid clinical note status transition'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER clinical_notes_transition_trigger
  BEFORE INSERT OR UPDATE ON public.clinical_notes
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_clinical_note_transition();
--> statement-breakpoint

-- Enable RLS
ALTER TABLE "care_episodes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinical_encounters" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "clinical_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- RLS Policies on care_episodes
CREATE POLICY "care_episodes_select_owner_only"
  ON "care_episodes"
  FOR SELECT
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

CREATE POLICY "care_episodes_insert_owner_only"
  ON "care_episodes"
  FOR INSERT
  TO authenticated
  WITH CHECK ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

CREATE POLICY "care_episodes_update_owner_only"
  ON "care_episodes"
  FOR UPDATE
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id())
  WITH CHECK ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

-- RLS Policies on clinical_encounters
CREATE POLICY "clinical_encounters_select_owner_only"
  ON "clinical_encounters"
  FOR SELECT
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

CREATE POLICY "clinical_encounters_insert_owner_only"
  ON "clinical_encounters"
  FOR INSERT
  TO authenticated
  WITH CHECK ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

-- RLS Policies on clinical_notes
CREATE POLICY "clinical_notes_select_owner_only"
  ON "clinical_notes"
  FOR SELECT
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "author_practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

CREATE POLICY "clinical_notes_insert_owner_only"
  ON "clinical_notes"
  FOR INSERT
  TO authenticated
  WITH CHECK ("organization_id" = public.current_organization_id() AND "author_practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

CREATE POLICY "clinical_notes_update_owner_only"
  ON "clinical_notes"
  FOR UPDATE
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "author_practitioner_id" = public.current_clinical_practitioner_id())
  WITH CHECK ("organization_id" = public.current_organization_id() AND "author_practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

-- Privileges & Grants
REVOKE ALL PRIVILEGES ON TABLE "care_episodes" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "clinical_encounters" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "clinical_notes" FROM PUBLIC, anon, authenticated;--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE "care_episodes" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "clinical_encounters" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "clinical_notes" TO authenticated;