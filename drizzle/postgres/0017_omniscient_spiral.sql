CREATE TABLE "clinical_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"practitioner_id" text NOT NULL,
	"care_episode_id" text,
	"encounter_id" text,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"storage_path" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinical_documents_category_check" CHECK ("clinical_documents"."category" IN ('report', 'assessment', 'prescription', 'referral', 'result', 'consent', 'correspondence', 'administrative', 'other')),
	CONSTRAINT "clinical_documents_mime_type_check" CHECK ("clinical_documents"."mime_type" IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
	CONSTRAINT "clinical_documents_size_check" CHECK ("clinical_documents"."size_bytes" > 0 AND "clinical_documents"."size_bytes" <= 10485760),
	CONSTRAINT "clinical_documents_title_check" CHECK (char_length(trim("clinical_documents"."title")) >= 1 AND char_length("clinical_documents"."title") <= 200),
	CONSTRAINT "clinical_documents_file_name_check" CHECK (char_length(trim("clinical_documents"."file_name")) >= 1 AND char_length("clinical_documents"."file_name") <= 255)
);
--> statement-breakpoint
CREATE TABLE "clinical_form_templates" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"practitioner_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"description" text,
	"schema_json" jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinical_form_templates_kind_check" CHECK ("clinical_form_templates"."kind" IN ('assessment', 'questionnaire', 'intake', 'follow_up', 'outcome', 'other')),
	CONSTRAINT "clinical_form_templates_name_check" CHECK (char_length(trim("clinical_form_templates"."name")) >= 1 AND char_length("clinical_form_templates"."name") <= 200)
);
--> statement-breakpoint
CREATE TABLE "clinical_form_responses" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"template_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"practitioner_id" text NOT NULL,
	"care_episode_id" text,
	"encounter_id" text,
	"answers_json" jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinical_form_responses_status_check" CHECK ("clinical_form_responses"."status" IN ('draft', 'finalized')),
	CONSTRAINT "clinical_form_responses_status_metadata_check" CHECK (("clinical_form_responses"."status" = 'draft' AND "clinical_form_responses"."finalized_at" IS NULL) OR ("clinical_form_responses"."status" = 'finalized' AND "clinical_form_responses"."finalized_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "clinical_measurements" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"practitioner_id" text NOT NULL,
	"care_episode_id" text,
	"encounter_id" text,
	"code" text NOT NULL,
	"label" text NOT NULL,
	"value_numeric" numeric,
	"value_text" text,
	"unit" text,
	"observed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clinical_measurements_value_xor_check" CHECK (("clinical_measurements"."value_numeric" IS NOT NULL AND "clinical_measurements"."value_text" IS NULL) OR ("clinical_measurements"."value_numeric" IS NULL AND "clinical_measurements"."value_text" IS NOT NULL)),
	CONSTRAINT "clinical_measurements_code_format_check" CHECK ("clinical_measurements"."code" ~ '^[a-z0-9][a-z0-9_.-]{0,99}$'),
	CONSTRAINT "clinical_measurements_label_check" CHECK (char_length(trim("clinical_measurements"."label")) >= 1 AND char_length("clinical_measurements"."label") <= 160),
	CONSTRAINT "clinical_measurements_unit_check" CHECK ("clinical_measurements"."unit" IS NULL OR char_length("clinical_measurements"."unit") <= 40),
	CONSTRAINT "clinical_measurements_value_text_check" CHECK ("clinical_measurements"."value_text" IS NULL OR char_length("clinical_measurements"."value_text") <= 500)
);
--> statement-breakpoint
-- Create all indexes first so composite foreign keys have target unique indexes ready
CREATE INDEX "clinical_documents_org_patient_created_idx" ON "clinical_documents" USING btree ("organization_id","patient_id","created_at");--> statement-breakpoint
CREATE INDEX "clinical_documents_org_practitioner_created_idx" ON "clinical_documents" USING btree ("organization_id","practitioner_id","created_at");--> statement-breakpoint
CREATE INDEX "clinical_documents_org_episode_idx" ON "clinical_documents" USING btree ("organization_id","care_episode_id");--> statement-breakpoint
CREATE INDEX "clinical_documents_org_encounter_idx" ON "clinical_documents" USING btree ("organization_id","encounter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_documents_org_id_unique" ON "clinical_documents" USING btree ("id","organization_id");--> statement-breakpoint

CREATE INDEX "clinical_form_templates_org_practitioner_idx" ON "clinical_form_templates" USING btree ("organization_id","practitioner_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_form_templates_org_id_unique" ON "clinical_form_templates" USING btree ("id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_form_templates_org_practitioner_id_unique" ON "clinical_form_templates" USING btree ("id","organization_id","practitioner_id");--> statement-breakpoint

CREATE INDEX "clinical_form_responses_org_patient_created_idx" ON "clinical_form_responses" USING btree ("organization_id","patient_id","created_at");--> statement-breakpoint
CREATE INDEX "clinical_form_responses_org_practitioner_created_idx" ON "clinical_form_responses" USING btree ("organization_id","practitioner_id","created_at");--> statement-breakpoint
CREATE INDEX "clinical_form_responses_org_template_idx" ON "clinical_form_responses" USING btree ("organization_id","template_id");--> statement-breakpoint
CREATE INDEX "clinical_form_responses_org_episode_idx" ON "clinical_form_responses" USING btree ("organization_id","care_episode_id");--> statement-breakpoint
CREATE INDEX "clinical_form_responses_org_encounter_idx" ON "clinical_form_responses" USING btree ("organization_id","encounter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_form_responses_org_id_unique" ON "clinical_form_responses" USING btree ("id","organization_id");--> statement-breakpoint

CREATE INDEX "clinical_measurements_org_patient_observed_idx" ON "clinical_measurements" USING btree ("organization_id","patient_id","observed_at");--> statement-breakpoint
CREATE INDEX "clinical_measurements_org_practitioner_observed_idx" ON "clinical_measurements" USING btree ("organization_id","practitioner_id","observed_at");--> statement-breakpoint
CREATE INDEX "clinical_measurements_org_patient_code_idx" ON "clinical_measurements" USING btree ("organization_id","patient_id","code","observed_at");--> statement-breakpoint
CREATE INDEX "clinical_measurements_org_episode_idx" ON "clinical_measurements" USING btree ("organization_id","care_episode_id");--> statement-breakpoint
CREATE INDEX "clinical_measurements_org_encounter_idx" ON "clinical_measurements" USING btree ("organization_id","encounter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "clinical_measurements_org_id_unique" ON "clinical_measurements" USING btree ("id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "clinical_encounters_id_org_episode_patient_practitioner_unique" ON "clinical_encounters" USING btree ("id","organization_id","care_episode_id","patient_id","practitioner_id");--> statement-breakpoint

-- Foreign Keys
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_patient_fk" FOREIGN KEY ("patient_id","organization_id") REFERENCES "public"."patient_profiles"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_practitioner_fk" FOREIGN KEY ("practitioner_id","organization_id") REFERENCES "public"."practice_practitioners"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_episode_fk" FOREIGN KEY ("care_episode_id","organization_id","patient_id","practitioner_id") REFERENCES "public"."care_episodes"("id","organization_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_encounter_fk" FOREIGN KEY ("encounter_id","organization_id","patient_id","practitioner_id") REFERENCES "public"."clinical_encounters"("id","organization_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_documents" ADD CONSTRAINT "clinical_documents_encounter_episode_fk" FOREIGN KEY ("encounter_id","organization_id","care_episode_id","patient_id","practitioner_id") REFERENCES "public"."clinical_encounters"("id","organization_id","care_episode_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "clinical_form_templates" ADD CONSTRAINT "clinical_form_templates_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_form_templates" ADD CONSTRAINT "clinical_form_templates_practitioner_fk" FOREIGN KEY ("practitioner_id","organization_id") REFERENCES "public"."practice_practitioners"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "clinical_form_responses" ADD CONSTRAINT "clinical_form_responses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_form_responses" ADD CONSTRAINT "clinical_form_responses_template_fk" FOREIGN KEY ("template_id","organization_id","practitioner_id") REFERENCES "public"."clinical_form_templates"("id","organization_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_form_responses" ADD CONSTRAINT "clinical_form_responses_patient_fk" FOREIGN KEY ("patient_id","organization_id") REFERENCES "public"."patient_profiles"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_form_responses" ADD CONSTRAINT "clinical_form_responses_practitioner_fk" FOREIGN KEY ("practitioner_id","organization_id") REFERENCES "public"."practice_practitioners"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_form_responses" ADD CONSTRAINT "clinical_form_responses_episode_fk" FOREIGN KEY ("care_episode_id","organization_id","patient_id","practitioner_id") REFERENCES "public"."care_episodes"("id","organization_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_form_responses" ADD CONSTRAINT "clinical_form_responses_encounter_fk" FOREIGN KEY ("encounter_id","organization_id","patient_id","practitioner_id") REFERENCES "public"."clinical_encounters"("id","organization_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_form_responses" ADD CONSTRAINT "clinical_form_responses_encounter_episode_fk" FOREIGN KEY ("encounter_id","organization_id","care_episode_id","patient_id","practitioner_id") REFERENCES "public"."clinical_encounters"("id","organization_id","care_episode_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

ALTER TABLE "clinical_measurements" ADD CONSTRAINT "clinical_measurements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_measurements" ADD CONSTRAINT "clinical_measurements_patient_fk" FOREIGN KEY ("patient_id","organization_id") REFERENCES "public"."patient_profiles"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_measurements" ADD CONSTRAINT "clinical_measurements_practitioner_fk" FOREIGN KEY ("practitioner_id","organization_id") REFERENCES "public"."practice_practitioners"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_measurements" ADD CONSTRAINT "clinical_measurements_episode_fk" FOREIGN KEY ("care_episode_id","organization_id","patient_id","practitioner_id") REFERENCES "public"."care_episodes"("id","organization_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_measurements" ADD CONSTRAINT "clinical_measurements_encounter_fk" FOREIGN KEY ("encounter_id","organization_id","patient_id","practitioner_id") REFERENCES "public"."clinical_encounters"("id","organization_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clinical_measurements" ADD CONSTRAINT "clinical_measurements_encounter_episode_fk" FOREIGN KEY ("encounter_id","organization_id","care_episode_id","patient_id","practitioner_id") REFERENCES "public"."clinical_encounters"("id","organization_id","care_episode_id","patient_id","practitioner_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint

-- ==========================================
-- STORAGE BUCKET & STORAGE POLICIES
-- ==========================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'clinical-documents',
  'clinical-documents',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[];--> statement-breakpoint

DROP POLICY IF EXISTS "clinical_documents_storage_select_owner_only" ON storage.objects;--> statement-breakpoint
CREATE POLICY "clinical_documents_storage_select_owner_only"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'clinical-documents'
  AND (storage.foldername(name))[1] = public.current_organization_id()
  AND (storage.foldername(name))[2] = public.current_clinical_practitioner_id()
);--> statement-breakpoint

DROP POLICY IF EXISTS "clinical_documents_storage_insert_owner_only" ON storage.objects;--> statement-breakpoint
CREATE POLICY "clinical_documents_storage_insert_owner_only"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'clinical-documents'
  AND (storage.foldername(name))[1] = public.current_organization_id()
  AND (storage.foldername(name))[2] = public.current_clinical_practitioner_id()
);--> statement-breakpoint

DROP POLICY IF EXISTS "clinical_documents_storage_update_owner_only" ON storage.objects;--> statement-breakpoint
CREATE POLICY "clinical_documents_storage_update_owner_only"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'clinical-documents'
  AND (storage.foldername(name))[1] = public.current_organization_id()
  AND (storage.foldername(name))[2] = public.current_clinical_practitioner_id()
)
WITH CHECK (
  bucket_id = 'clinical-documents'
  AND (storage.foldername(name))[1] = public.current_organization_id()
  AND (storage.foldername(name))[2] = public.current_clinical_practitioner_id()
);--> statement-breakpoint

-- ==========================================
-- TRIGGERS & BUSINESS INTEGRITY FUNCTIONS
-- ==========================================

-- 1. Document Mutation Guard
CREATE OR REPLACE FUNCTION public.enforce_clinical_document_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.id <> OLD.id
       OR NEW.organization_id <> OLD.organization_id
       OR NEW.patient_id <> OLD.patient_id
       OR NEW.practitioner_id <> OLD.practitioner_id
       OR NEW.care_episode_id IS DISTINCT FROM OLD.care_episode_id
       OR NEW.encounter_id IS DISTINCT FROM OLD.encounter_id
       OR NEW.storage_path <> OLD.storage_path
       OR NEW.file_name <> OLD.file_name
       OR NEW.mime_type <> OLD.mime_type
       OR NEW.size_bytes <> OLD.size_bytes
       OR NEW.created_at <> OLD.created_at THEN
      RAISE EXCEPTION 'Structural mutation is not allowed on clinical documents'
        USING ERRCODE = '23514';
    END IF;
    NEW.updated_at := now();
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS clinical_documents_mutation_guard ON public.clinical_documents;--> statement-breakpoint
CREATE TRIGGER clinical_documents_mutation_guard
BEFORE UPDATE ON public.clinical_documents
FOR EACH ROW
EXECUTE FUNCTION public.enforce_clinical_document_mutation();--> statement-breakpoint

-- 2. Form Response Transition Guard
CREATE OR REPLACE FUNCTION public.enforce_clinical_form_response_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'draft' OR NEW.finalized_at IS NOT NULL THEN
      RAISE EXCEPTION 'Clinical form responses must be created as draft without finalized_at'
        USING ERRCODE = '23514';
    END IF;
    NEW.created_at := COALESCE(NEW.created_at, now());
    NEW.updated_at := now();
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'finalized' THEN
      RAISE EXCEPTION 'Finalized clinical form responses are immutable'
        USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'draft' AND NEW.status = 'draft' THEN
      IF NEW.id <> OLD.id
         OR NEW.organization_id <> OLD.organization_id
         OR NEW.patient_id <> OLD.patient_id
         OR NEW.practitioner_id <> OLD.practitioner_id
         OR NEW.template_id <> OLD.template_id
         OR NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Structural mutation is not allowed on draft clinical form responses'
          USING ERRCODE = '23514';
      END IF;
      NEW.finalized_at := NULL;
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    IF OLD.status = 'draft' AND NEW.status = 'finalized' THEN
      IF NEW.id <> OLD.id
         OR NEW.organization_id <> OLD.organization_id
         OR NEW.patient_id <> OLD.patient_id
         OR NEW.practitioner_id <> OLD.practitioner_id
         OR NEW.template_id <> OLD.template_id
         OR NEW.created_at <> OLD.created_at THEN
        RAISE EXCEPTION 'Structural mutation is not allowed during form response finalization'
          USING ERRCODE = '23514';
      END IF;
      NEW.finalized_at := now();
      NEW.updated_at := now();
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid form response status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS clinical_form_responses_transition_guard ON public.clinical_form_responses;--> statement-breakpoint
CREATE TRIGGER clinical_form_responses_transition_guard
BEFORE INSERT OR UPDATE ON public.clinical_form_responses
FOR EACH ROW
EXECUTE FUNCTION public.enforce_clinical_form_response_transition();--> statement-breakpoint

-- 3. Clinical Measurement Insert Guard
CREATE OR REPLACE FUNCTION public.enforce_clinical_measurement_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.observed_at > now() THEN
    RAISE EXCEPTION 'Cannot record a clinical measurement in the future'
      USING ERRCODE = '23514';
  END IF;
  NEW.created_at := COALESCE(NEW.created_at, now());
  RETURN NEW;
END;
$$;--> statement-breakpoint

DROP TRIGGER IF EXISTS clinical_measurements_insert_guard ON public.clinical_measurements;--> statement-breakpoint
CREATE TRIGGER clinical_measurements_insert_guard
BEFORE INSERT ON public.clinical_measurements
FOR EACH ROW
EXECUTE FUNCTION public.enforce_clinical_measurement_insert();--> statement-breakpoint

-- ==========================================
-- ROW LEVEL SECURITY (OWNER-ONLY)
-- ==========================================

-- 1. clinical_documents
ALTER TABLE "clinical_documents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "clinical_documents_select_owner_only"
  ON "clinical_documents"
  FOR SELECT
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

CREATE POLICY "clinical_documents_insert_owner_only"
  ON "clinical_documents"
  FOR INSERT
  TO authenticated
  WITH CHECK ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

CREATE POLICY "clinical_documents_update_owner_only"
  ON "clinical_documents"
  FOR UPDATE
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id())
  WITH CHECK ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

-- 2. clinical_form_templates
ALTER TABLE "clinical_form_templates" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "clinical_form_templates_select_owner_only"
  ON "clinical_form_templates"
  FOR SELECT
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

CREATE POLICY "clinical_form_templates_insert_owner_only"
  ON "clinical_form_templates"
  FOR INSERT
  TO authenticated
  WITH CHECK ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

CREATE POLICY "clinical_form_templates_update_owner_only"
  ON "clinical_form_templates"
  FOR UPDATE
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id())
  WITH CHECK ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

-- 3. clinical_form_responses
ALTER TABLE "clinical_form_responses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "clinical_form_responses_select_owner_only"
  ON "clinical_form_responses"
  FOR SELECT
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

CREATE POLICY "clinical_form_responses_insert_owner_only"
  ON "clinical_form_responses"
  FOR INSERT
  TO authenticated
  WITH CHECK ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

CREATE POLICY "clinical_form_responses_update_owner_only"
  ON "clinical_form_responses"
  FOR UPDATE
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id())
  WITH CHECK ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

-- 4. clinical_measurements
ALTER TABLE "clinical_measurements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

CREATE POLICY "clinical_measurements_select_owner_only"
  ON "clinical_measurements"
  FOR SELECT
  TO authenticated
  USING ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

CREATE POLICY "clinical_measurements_insert_owner_only"
  ON "clinical_measurements"
  FOR INSERT
  TO authenticated
  WITH CHECK ("organization_id" = public.current_organization_id() AND "practitioner_id" = public.current_clinical_practitioner_id());--> statement-breakpoint

-- ==========================================
-- PRIVILEGES & STRICT GRANTS
-- ==========================================

REVOKE ALL PRIVILEGES ON TABLE "clinical_documents" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "clinical_form_templates" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "clinical_form_responses" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "clinical_measurements" FROM PUBLIC, anon, authenticated;--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE "clinical_documents" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "clinical_form_templates" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "clinical_form_responses" TO authenticated;--> statement-breakpoint
GRANT SELECT, INSERT ON TABLE "clinical_measurements" TO authenticated;--> statement-breakpoint

REVOKE EXECUTE ON FUNCTION public.enforce_clinical_document_mutation() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.enforce_clinical_form_response_transition() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.enforce_clinical_measurement_insert() FROM PUBLIC, anon, authenticated;