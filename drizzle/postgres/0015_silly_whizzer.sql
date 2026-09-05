CREATE TABLE "appointment_waitlist_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"appointment_type_id" text NOT NULL,
	"location_id" text NOT NULL,
	"practitioner_id" text,
	"preferred_date_from" date NOT NULL,
	"preferred_date_until" date,
	"preferred_start_time" time,
	"preferred_end_time" time,
	"timezone" text NOT NULL,
	"status" text DEFAULT 'waiting' NOT NULL,
	"resolution_code" text,
	"resolved_at" timestamp with time zone,
	"resolved_appointment_id" text,
	"created_by_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_status_check" CHECK ("appointment_waitlist_entries"."status" IN ('waiting', 'resolved')),
	CONSTRAINT "waitlist_resolution_code_check" CHECK ("appointment_waitlist_entries"."resolution_code" IS NULL OR "appointment_waitlist_entries"."resolution_code" IN ('booked', 'withdrawn', 'not_needed', 'other')),
	CONSTRAINT "waitlist_date_check" CHECK ("appointment_waitlist_entries"."preferred_date_until" IS NULL OR "appointment_waitlist_entries"."preferred_date_until" >= "appointment_waitlist_entries"."preferred_date_from"),
	CONSTRAINT "waitlist_time_check" CHECK (("appointment_waitlist_entries"."preferred_start_time" IS NULL AND "appointment_waitlist_entries"."preferred_end_time" IS NULL) OR ("appointment_waitlist_entries"."preferred_start_time" IS NOT NULL AND "appointment_waitlist_entries"."preferred_end_time" IS NOT NULL AND "appointment_waitlist_entries"."preferred_start_time" < "appointment_waitlist_entries"."preferred_end_time")),
	CONSTRAINT "waitlist_state_check" CHECK (("appointment_waitlist_entries"."status" = 'waiting' AND "appointment_waitlist_entries"."resolution_code" IS NULL AND "appointment_waitlist_entries"."resolved_at" IS NULL AND "appointment_waitlist_entries"."resolved_appointment_id" IS NULL) OR ("appointment_waitlist_entries"."status" = 'resolved' AND "appointment_waitlist_entries"."resolution_code" = 'booked' AND "appointment_waitlist_entries"."resolved_at" IS NOT NULL AND "appointment_waitlist_entries"."resolved_appointment_id" IS NOT NULL) OR ("appointment_waitlist_entries"."status" = 'resolved' AND "appointment_waitlist_entries"."resolution_code" IN ('withdrawn', 'not_needed', 'other') AND "appointment_waitlist_entries"."resolved_at" IS NOT NULL AND "appointment_waitlist_entries"."resolved_appointment_id" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "appointments" DROP CONSTRAINT "appointments_status_check";--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancellation_reason_code" text;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "cancelled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "no_show_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "appointment_waitlist_entries" ADD CONSTRAINT "appointment_waitlist_entries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlist_entries" ADD CONSTRAINT "waitlist_patient_fk" FOREIGN KEY ("patient_id","organization_id") REFERENCES "public"."patient_profiles"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlist_entries" ADD CONSTRAINT "waitlist_appointment_type_fk" FOREIGN KEY ("appointment_type_id","organization_id") REFERENCES "public"."appointment_types"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlist_entries" ADD CONSTRAINT "waitlist_location_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."practice_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlist_entries" ADD CONSTRAINT "waitlist_practitioner_location_fk" FOREIGN KEY ("organization_id","practitioner_id","location_id") REFERENCES "public"."practitioner_locations"("organization_id","practitioner_id","location_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlist_entries" ADD CONSTRAINT "waitlist_resolved_appointment_fk" FOREIGN KEY ("resolved_appointment_id","organization_id") REFERENCES "public"."appointments"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointment_waitlist_entries" ADD CONSTRAINT "waitlist_created_by_user_fk" FOREIGN KEY ("created_by_user_id","organization_id") REFERENCES "public"."users"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "waitlist_org_status_idx" ON "appointment_waitlist_entries" USING btree ("organization_id","status");--> statement-breakpoint
CREATE INDEX "waitlist_patient_idx" ON "appointment_waitlist_entries" USING btree ("organization_id","patient_id");--> statement-breakpoint
CREATE INDEX "waitlist_practitioner_idx" ON "appointment_waitlist_entries" USING btree ("organization_id","practitioner_id");--> statement-breakpoint
CREATE INDEX "waitlist_match_idx" ON "appointment_waitlist_entries" USING btree ("organization_id","location_id","appointment_type_id","status","preferred_date_from");--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_waitlist_entries_org_id_unique" ON "appointment_waitlist_entries" USING btree ("id","organization_id");--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_cancellation_reason_check" CHECK ("appointments"."cancellation_reason_code" IS NULL OR "appointments"."cancellation_reason_code" IN ('patient_request', 'practitioner_request', 'practice_unavailable', 'scheduling_error', 'duplicate', 'other'));--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_status_metadata_check" CHECK (("appointments"."status" = 'scheduled' AND "appointments"."cancellation_reason_code" IS NULL AND "appointments"."cancelled_at" IS NULL AND "appointments"."no_show_at" IS NULL) OR ("appointments"."status" = 'cancelled' AND "appointments"."cancellation_reason_code" IS NOT NULL AND "appointments"."cancelled_at" IS NOT NULL AND "appointments"."no_show_at" IS NULL) OR ("appointments"."status" = 'no_show' AND "appointments"."cancellation_reason_code" IS NULL AND "appointments"."cancelled_at" IS NULL AND "appointments"."no_show_at" IS NOT NULL));--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_status_check" CHECK ("appointments"."status" IN ('scheduled', 'cancelled', 'no_show'));--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.enforce_appointment_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'scheduled' THEN
      RAISE EXCEPTION 'Appointments must be inserted with status scheduled'
        USING ERRCODE = '23514';
    END IF;
    NEW.cancellation_reason_code := NULL;
    NEW.cancelled_at := NULL;
    NEW.no_show_at := NULL;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If already terminal, reject any update
    IF OLD.status IN ('cancelled', 'no_show') THEN
      RAISE EXCEPTION 'Terminal appointment status is immutable'
        USING ERRCODE = '23514';
    END IF;

    -- scheduled -> cancelled
    IF OLD.status = 'scheduled' AND NEW.status = 'cancelled' THEN
      IF NEW.cancellation_reason_code IS NULL THEN
        RAISE EXCEPTION 'Cancellation reason code is required when cancelling appointment'
          USING ERRCODE = '23514';
      END IF;
      NEW.cancelled_at := now();
      NEW.no_show_at := NULL;
      RETURN NEW;
    END IF;

    -- scheduled -> no_show
    IF OLD.status = 'scheduled' AND NEW.status = 'no_show' THEN
      NEW.no_show_at := now();
      NEW.cancelled_at := NULL;
      NEW.cancellation_reason_code := NULL;
      RETURN NEW;
    END IF;

    -- scheduled -> scheduled (rescheduling, room/practitioner/type update)
    IF OLD.status = 'scheduled' AND NEW.status = 'scheduled' THEN
      NEW.cancellation_reason_code := NULL;
      NEW.cancelled_at := NULL;
      NEW.no_show_at := NULL;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid appointment status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS appointments_status_transition_guard ON public.appointments;--> statement-breakpoint
CREATE TRIGGER appointments_status_transition_guard
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_appointment_status_transition();--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.enforce_waitlist_status_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'waiting' THEN
      RAISE EXCEPTION 'Waitlist entries must be inserted with status waiting'
        USING ERRCODE = '23514';
    END IF;
    NEW.resolution_code := NULL;
    NEW.resolved_at := NULL;
    NEW.resolved_appointment_id := NULL;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    -- If already resolved, reject any mutation
    IF OLD.status = 'resolved' THEN
      RAISE EXCEPTION 'Resolved waitlist entries are immutable'
        USING ERRCODE = '23514';
    END IF;

    -- waiting -> resolved
    IF OLD.status = 'waiting' AND NEW.status = 'resolved' THEN
      IF NEW.resolution_code IS NULL THEN
        RAISE EXCEPTION 'Resolution code is required when resolving waitlist entry'
          USING ERRCODE = '23514';
      END IF;
      IF NEW.resolution_code = 'booked' AND NEW.resolved_appointment_id IS NULL THEN
        RAISE EXCEPTION 'Resolved appointment ID is required for booked resolution'
          USING ERRCODE = '23514';
      END IF;
      IF NEW.resolution_code <> 'booked' AND NEW.resolved_appointment_id IS NOT NULL THEN
        RAISE EXCEPTION 'Resolved appointment ID must be null for non-booked resolution'
          USING ERRCODE = '23514';
      END IF;
      NEW.resolved_at := now();
      RETURN NEW;
    END IF;

    -- waiting -> waiting (update preferences)
    IF OLD.status = 'waiting' AND NEW.status = 'waiting' THEN
      NEW.resolution_code := NULL;
      NEW.resolved_at := NULL;
      NEW.resolved_appointment_id := NULL;
      RETURN NEW;
    END IF;

    RAISE EXCEPTION 'Invalid waitlist status transition from % to %', OLD.status, NEW.status
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;--> statement-breakpoint
DROP TRIGGER IF EXISTS appointment_waitlist_status_transition_guard ON public.appointment_waitlist_entries;--> statement-breakpoint
CREATE TRIGGER appointment_waitlist_status_transition_guard
BEFORE INSERT OR UPDATE ON public.appointment_waitlist_entries
FOR EACH ROW
EXECUTE FUNCTION public.enforce_waitlist_status_transition();--> statement-breakpoint
ALTER TABLE "appointment_waitlist_entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "appointment_waitlist_entries_tenant_isolation" ON "appointment_waitlist_entries"
AS PERMISSIVE FOR ALL
TO authenticated
USING (
  organization_id = public.current_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.users caller
    WHERE caller.id = auth.uid()::text
      AND caller.organization_id = public.current_organization_id()
      AND caller.profile_type = 'professional'
  )
)
WITH CHECK (
  organization_id = public.current_organization_id()
  AND EXISTS (
    SELECT 1 FROM public.users caller
    WHERE caller.id = auth.uid()::text
      AND caller.organization_id = public.current_organization_id()
      AND caller.profile_type = 'professional'
  )
);--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "appointment_waitlist_entries" FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "appointment_waitlist_entries" TO authenticated;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.enforce_appointment_status_transition() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
REVOKE EXECUTE ON FUNCTION public.enforce_waitlist_status_transition() FROM PUBLIC, anon, authenticated;