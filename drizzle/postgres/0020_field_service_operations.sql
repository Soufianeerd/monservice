-- Migration 0020: Field Service Operations (Sites, Work Orders, Assignments, Reports, Status History)

-- 1. Table: field_service_sites
CREATE TABLE IF NOT EXISTS "field_service_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"label" text NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"postal_code" text NOT NULL,
	"city" text NOT NULL,
	"country" text DEFAULT 'FR' NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"access_instructions" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_service_sites_label_check" CHECK (char_length(trim("label")) >= 1 AND char_length(trim("label")) <= 160),
	CONSTRAINT "field_service_sites_latitude_check" CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)),
	CONSTRAINT "field_service_sites_longitude_check" CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180)),
	CONSTRAINT "field_service_sites_country_check" CHECK ("country" = UPPER("country") AND char_length("country") = 2)
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "field_service_sites_id_org_client_unique" ON "field_service_sites" ("id", "organization_id", "client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_sites_org_client_idx" ON "field_service_sites" ("organization_id", "client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_sites_org_active_idx" ON "field_service_sites" ("organization_id", "is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_sites_org_city_idx" ON "field_service_sites" ("organization_id", "city");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_sites" ADD CONSTRAINT "field_service_sites_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_sites" ADD CONSTRAINT "field_service_sites_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 2. Table: field_service_work_orders
CREATE TABLE IF NOT EXISTS "field_service_work_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"client_id" text NOT NULL,
	"site_id" text,
	"created_by_user_id" text NOT NULL,
	"reference" text NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"work_type" text DEFAULT 'intervention' NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"priority" text DEFAULT 'medium' NOT NULL,
	"scheduled_start" timestamp with time zone,
	"scheduled_end" timestamp with time zone,
	"actual_start" timestamp with time zone,
	"actual_end" timestamp with time zone,
	"cancellation_reason_code" text,
	"cancellation_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_service_work_orders_reference_check" CHECK (char_length(trim("reference")) >= 1 AND char_length(trim("reference")) <= 64),
	CONSTRAINT "field_service_work_orders_title_check" CHECK (char_length(trim("title")) >= 1 AND char_length(trim("title")) <= 200),
	CONSTRAINT "field_service_work_orders_work_type_check" CHECK ("work_type" IN ('job', 'intervention', 'installation', 'maintenance', 'repair', 'inspection', 'project', 'other')),
	CONSTRAINT "field_service_work_orders_status_check" CHECK ("status" IN ('draft', 'scheduled', 'in_progress', 'paused', 'completed', 'cancelled')),
	CONSTRAINT "field_service_work_orders_priority_check" CHECK ("priority" IN ('low', 'medium', 'high', 'urgent')),
	CONSTRAINT "field_service_work_orders_cancellation_reason_check" CHECK (("status" != 'cancelled' AND "cancellation_reason_code" IS NULL) OR ("status" = 'cancelled' AND "cancellation_reason_code" IN ('customer_request', 'unavailable', 'duplicate', 'quote_not_accepted', 'scheduling_issue', 'technical_impossibility', 'other'))),
	CONSTRAINT "field_service_work_orders_schedule_dates_check" CHECK ("scheduled_start" IS NULL OR "scheduled_end" IS NULL OR "scheduled_end" > "scheduled_start"),
	CONSTRAINT "field_service_work_orders_actual_dates_check" CHECK ("actual_end" IS NULL OR ("actual_start" IS NOT NULL AND "actual_end" >= "actual_start"))
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "field_service_work_orders_org_ref_unique" ON "field_service_work_orders" ("organization_id", "reference");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "field_service_work_orders_id_org_unique" ON "field_service_work_orders" ("id", "organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_work_orders_org_status_idx" ON "field_service_work_orders" ("organization_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_work_orders_org_sched_start_idx" ON "field_service_work_orders" ("organization_id", "scheduled_start");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_work_orders_org_client_idx" ON "field_service_work_orders" ("organization_id", "client_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_work_orders_org_site_idx" ON "field_service_work_orders" ("organization_id", "site_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_work_orders_org_priority_idx" ON "field_service_work_orders" ("organization_id", "priority");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_orders" ADD CONSTRAINT "field_service_work_orders_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_orders" ADD CONSTRAINT "field_service_work_orders_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_orders" ADD CONSTRAINT "field_service_work_orders_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_orders" ADD CONSTRAINT "field_service_work_orders_site_fk" FOREIGN KEY ("site_id", "organization_id", "client_id") REFERENCES "field_service_sites"("id", "organization_id", "client_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 3. Table: field_service_work_order_assignments
CREATE TABLE IF NOT EXISTS "field_service_work_order_assignments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"work_order_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'technician' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"removed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_service_assignments_role_check" CHECK ("role" IN ('lead', 'technician', 'assistant', 'observer'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_assignments_org_wo_idx" ON "field_service_work_order_assignments" ("organization_id", "work_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_assignments_org_user_idx" ON "field_service_work_order_assignments" ("organization_id", "user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_assignments_wo_active_idx" ON "field_service_work_order_assignments" ("work_order_id", "is_active");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_order_assignments" ADD CONSTRAINT "field_service_work_order_assignments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_order_assignments" ADD CONSTRAINT "field_service_work_order_assignments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_order_assignments" ADD CONSTRAINT "field_service_assignments_work_order_fk" FOREIGN KEY ("work_order_id", "organization_id") REFERENCES "field_service_work_orders"("id", "organization_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 4. Table: field_service_work_reports
CREATE TABLE IF NOT EXISTS "field_service_work_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"work_order_id" text NOT NULL,
	"author_user_id" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"summary" text NOT NULL,
	"work_performed" text,
	"issues_found" text,
	"recommendations" text,
	"customer_notes" text,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_service_reports_summary_check" CHECK (char_length(trim("summary")) >= 1 AND char_length(trim("summary")) <= 2000),
	CONSTRAINT "field_service_reports_status_check" CHECK ("status" IN ('draft', 'finalized')),
	CONSTRAINT "field_service_reports_status_metadata_check" CHECK (("status" = 'draft' AND "finalized_at" IS NULL) OR ("status" = 'finalized' AND "finalized_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_reports_org_wo_idx" ON "field_service_work_reports" ("organization_id", "work_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_reports_org_author_idx" ON "field_service_work_reports" ("organization_id", "author_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_reports_wo_status_idx" ON "field_service_work_reports" ("work_order_id", "status");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_reports" ADD CONSTRAINT "field_service_work_reports_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_reports" ADD CONSTRAINT "field_service_work_reports_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_reports" ADD CONSTRAINT "field_service_reports_work_order_fk" FOREIGN KEY ("work_order_id", "organization_id") REFERENCES "field_service_work_orders"("id", "organization_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 5. Table: field_service_work_order_status_history
CREATE TABLE IF NOT EXISTS "field_service_work_order_status_history" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"work_order_id" text NOT NULL,
	"from_status" text,
	"to_status" text NOT NULL,
	"changed_by_user_id" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "field_service_status_history_to_status_check" CHECK ("to_status" IN ('draft', 'scheduled', 'in_progress', 'paused', 'completed', 'cancelled')),
	CONSTRAINT "field_service_status_history_from_status_check" CHECK ("from_status" IS NULL OR "from_status" IN ('draft', 'scheduled', 'in_progress', 'paused', 'completed', 'cancelled'))
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_status_history_org_wo_created_idx" ON "field_service_work_order_status_history" ("organization_id", "work_order_id", "created_at");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_order_status_history" ADD CONSTRAINT "field_service_work_order_status_history_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_order_status_history" ADD CONSTRAINT "field_service_work_order_status_history_changed_by_user_id_users_id_fk" FOREIGN KEY ("changed_by_user_id") REFERENCES "users"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "field_service_work_order_status_history" ADD CONSTRAINT "field_service_status_history_work_order_fk" FOREIGN KEY ("work_order_id", "organization_id") REFERENCES "field_service_work_orders"("id", "organization_id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint

-- 6. DB RLS Helper: is_current_field_service_professional
CREATE OR REPLACE FUNCTION public.is_current_field_service_professional(
  p_organization_id text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.uid() IS NULL OR p_organization_id IS NULL THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.organizations o ON o.id = u.organization_id
    WHERE u.id = auth.uid()::text
      AND u.profile_type = 'professional'
      AND u.organization_id = p_organization_id
      AND o.sector IN ('field_services', 'artisan')
  );
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.is_current_field_service_professional(text) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.is_current_field_service_professional(text) TO authenticated;
--> statement-breakpoint

-- 7. Trigger Function: enforce_field_service_work_order_transition
CREATE OR REPLACE FUNCTION public.enforce_field_service_work_order_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft', 'scheduled') THEN
      RAISE EXCEPTION 'New work order must be created in draft or scheduled status' USING ERRCODE = '23514';
    END IF;
    IF NEW.status = 'draft' THEN
      NEW.actual_start := NULL;
      NEW.actual_end := NULL;
      NEW.cancellation_reason_code := NULL;
    ELSIF NEW.status = 'scheduled' THEN
      NEW.actual_start := NULL;
      NEW.actual_end := NULL;
      NEW.cancellation_reason_code := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF OLD.status IN ('completed', 'cancelled') THEN
        RAISE EXCEPTION 'Cannot transition from terminal status %', OLD.status USING ERRCODE = '23514';
      END IF;

      IF OLD.status = 'draft' AND NEW.status NOT IN ('scheduled', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from draft to %', NEW.status USING ERRCODE = '23514';
      END IF;

      IF OLD.status = 'scheduled' AND NEW.status NOT IN ('draft', 'in_progress', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from scheduled to %', NEW.status USING ERRCODE = '23514';
      END IF;

      IF OLD.status = 'in_progress' AND NEW.status NOT IN ('paused', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from in_progress to %', NEW.status USING ERRCODE = '23514';
      END IF;

      IF OLD.status = 'paused' AND NEW.status NOT IN ('in_progress', 'completed', 'cancelled') THEN
        RAISE EXCEPTION 'Invalid status transition from paused to %', NEW.status USING ERRCODE = '23514';
      END IF;

      IF NEW.status = 'in_progress' THEN
        IF NEW.actual_start IS NULL THEN
          NEW.actual_start := now();
        END IF;
      END IF;

      IF NEW.status = 'completed' THEN
        IF NEW.actual_start IS NULL THEN
          NEW.actual_start := COALESCE(OLD.actual_start, now());
        END IF;
        NEW.actual_end := now();
      END IF;

      IF NEW.status = 'cancelled' THEN
        IF NEW.cancellation_reason_code IS NULL THEN
          RAISE EXCEPTION 'Cancellation reason code is required when cancelling a work order' USING ERRCODE = '23514';
        END IF;
        IF NEW.actual_start IS NOT NULL AND NEW.actual_end IS NULL THEN
          NEW.actual_end := now();
        END IF;
      END IF;
    ELSE
      IF OLD.status IN ('completed', 'cancelled') THEN
        IF OLD.status != NEW.status OR OLD.cancellation_reason_code IS DISTINCT FROM NEW.cancellation_reason_code OR OLD.actual_start IS DISTINCT FROM NEW.actual_start OR OLD.actual_end IS DISTINCT FROM NEW.actual_end THEN
          RAISE EXCEPTION 'Cannot modify terminal work order execution details' USING ERRCODE = '23514';
        END IF;
      END IF;
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_field_service_work_order_transition() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_field_service_work_order_transition ON public.field_service_work_orders;
--> statement-breakpoint
CREATE TRIGGER trg_field_service_work_order_transition
BEFORE INSERT OR UPDATE ON public.field_service_work_orders
FOR EACH ROW
EXECUTE FUNCTION public.enforce_field_service_work_order_transition();
--> statement-breakpoint

-- 8. Trigger Function: record_field_service_work_order_status_history
CREATE OR REPLACE FUNCTION public.record_field_service_work_order_status_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.field_service_work_order_status_history (
      id,
      organization_id,
      work_order_id,
      from_status,
      to_status,
      changed_by_user_id,
      reason,
      created_at
    ) VALUES (
      gen_random_uuid()::text,
      NEW.organization_id,
      NEW.id,
      NULL,
      NEW.status,
      NEW.created_by_user_id,
      'Initial creation',
      now()
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      INSERT INTO public.field_service_work_order_status_history (
        id,
        organization_id,
        work_order_id,
        from_status,
        to_status,
        changed_by_user_id,
        reason,
        created_at
      ) VALUES (
        gen_random_uuid()::text,
        NEW.organization_id,
        NEW.id,
        OLD.status,
        NEW.status,
        COALESCE(auth.uid()::text, NEW.created_by_user_id),
        CASE WHEN NEW.status = 'cancelled' THEN NEW.cancellation_notes ELSE NULL END,
        now()
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.record_field_service_work_order_status_history() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_field_service_work_order_status_history ON public.field_service_work_orders;
--> statement-breakpoint
CREATE TRIGGER trg_field_service_work_order_status_history
AFTER INSERT OR UPDATE OF status ON public.field_service_work_orders
FOR EACH ROW
EXECUTE FUNCTION public.record_field_service_work_order_status_history();
--> statement-breakpoint

-- 9. Trigger Function: enforce_field_service_status_history_append_only
CREATE OR REPLACE FUNCTION public.enforce_field_service_status_history_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'field_service_work_order_status_history is append-only' USING ERRCODE = '23514';
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_field_service_status_history_append_only() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_field_service_status_history_append_only ON public.field_service_work_order_status_history;
--> statement-breakpoint
CREATE TRIGGER trg_field_service_status_history_append_only
BEFORE UPDATE OR DELETE ON public.field_service_work_order_status_history
FOR EACH ROW
EXECUTE FUNCTION public.enforce_field_service_status_history_append_only();
--> statement-breakpoint

-- 10. Trigger Function: enforce_field_service_assignment_invariants
CREATE OR REPLACE FUNCTION public.enforce_field_service_assignment_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_org text;
  v_profile_type text;
  v_wo_status text;
BEGIN
  SELECT u.organization_id, u.profile_type
  INTO v_user_org, v_profile_type
  FROM public.users u
  WHERE u.id = NEW.user_id;

  IF v_profile_type IS NULL OR v_profile_type != 'professional' OR v_user_org != NEW.organization_id THEN
    RAISE EXCEPTION 'Assigned user must be an active professional in the same organization' USING ERRCODE = '23514';
  END IF;

  SELECT wo.status INTO v_wo_status
  FROM public.field_service_work_orders wo
  WHERE wo.id = NEW.work_order_id AND wo.organization_id = NEW.organization_id;

  IF v_wo_status IN ('completed', 'cancelled') AND NEW.is_active = true THEN
    RAISE EXCEPTION 'Cannot assign technician to completed or cancelled work order' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_field_service_assignment_invariants() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_field_service_assignment_invariants ON public.field_service_work_order_assignments;
--> statement-breakpoint
CREATE TRIGGER trg_field_service_assignment_invariants
BEFORE INSERT OR UPDATE ON public.field_service_work_order_assignments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_field_service_assignment_invariants();
--> statement-breakpoint

-- 11. Trigger Function: enforce_field_service_work_report_transition
CREATE OR REPLACE FUNCTION public.enforce_field_service_work_report_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'Work reports cannot be deleted' USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status != 'draft' THEN
      RAISE EXCEPTION 'New work report must be created in draft status' USING ERRCODE = '23514';
    END IF;
    NEW.finalized_at := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'finalized' THEN
      RAISE EXCEPTION 'Finalized work reports are immutable' USING ERRCODE = '23514';
    END IF;

    IF OLD.status = 'draft' AND NEW.status = 'finalized' THEN
      NEW.finalized_at := now();
    END IF;

    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_field_service_work_report_transition() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
DROP TRIGGER IF EXISTS trg_field_service_work_report_transition ON public.field_service_work_reports;
--> statement-breakpoint
CREATE TRIGGER trg_field_service_work_report_transition
BEFORE INSERT OR UPDATE OR DELETE ON public.field_service_work_reports
FOR EACH ROW
EXECUTE FUNCTION public.enforce_field_service_work_report_transition();
--> statement-breakpoint

-- 12. Row Level Security (RLS)
ALTER TABLE public.field_service_sites ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.field_service_work_orders ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.field_service_work_order_assignments ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.field_service_work_reports ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.field_service_work_order_status_history ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS "field_service_sites_professional_policy" ON public.field_service_sites;
--> statement-breakpoint
CREATE POLICY "field_service_sites_professional_policy" ON public.field_service_sites
AS PERMISSIVE FOR ALL
TO authenticated
USING (public.is_current_field_service_professional(organization_id))
WITH CHECK (public.is_current_field_service_professional(organization_id));
--> statement-breakpoint

DROP POLICY IF EXISTS "field_service_work_orders_professional_policy" ON public.field_service_work_orders;
--> statement-breakpoint
CREATE POLICY "field_service_work_orders_professional_policy" ON public.field_service_work_orders
AS PERMISSIVE FOR ALL
TO authenticated
USING (public.is_current_field_service_professional(organization_id))
WITH CHECK (public.is_current_field_service_professional(organization_id));
--> statement-breakpoint

DROP POLICY IF EXISTS "field_service_assignments_professional_policy" ON public.field_service_work_order_assignments;
--> statement-breakpoint
CREATE POLICY "field_service_assignments_professional_policy" ON public.field_service_work_order_assignments
AS PERMISSIVE FOR ALL
TO authenticated
USING (public.is_current_field_service_professional(organization_id))
WITH CHECK (public.is_current_field_service_professional(organization_id));
--> statement-breakpoint

DROP POLICY IF EXISTS "field_service_reports_professional_policy" ON public.field_service_work_reports;
--> statement-breakpoint
CREATE POLICY "field_service_reports_professional_policy" ON public.field_service_work_reports
AS PERMISSIVE FOR ALL
TO authenticated
USING (public.is_current_field_service_professional(organization_id))
WITH CHECK (public.is_current_field_service_professional(organization_id));
--> statement-breakpoint

DROP POLICY IF EXISTS "field_service_status_history_professional_policy" ON public.field_service_work_order_status_history;
--> statement-breakpoint
CREATE POLICY "field_service_status_history_professional_policy" ON public.field_service_work_order_status_history
AS PERMISSIVE FOR SELECT
TO authenticated
USING (public.is_current_field_service_professional(organization_id));
--> statement-breakpoint

-- 13. Grants
REVOKE ALL ON TABLE public.field_service_sites FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE public.field_service_work_orders FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE public.field_service_work_order_assignments FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE public.field_service_work_reports FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON TABLE public.field_service_work_order_status_history FROM PUBLIC, anon, authenticated;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE ON TABLE public.field_service_sites TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.field_service_work_orders TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.field_service_work_order_assignments TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.field_service_work_reports TO authenticated;
--> statement-breakpoint
GRANT SELECT ON TABLE public.field_service_work_order_status_history TO authenticated;
