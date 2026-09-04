CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
CREATE TABLE "appointment_types" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"duration_minutes" integer NOT NULL,
	"buffer_before_minutes" integer DEFAULT 0 NOT NULL,
	"buffer_after_minutes" integer DEFAULT 0 NOT NULL,
	"slot_step_minutes" integer DEFAULT 15 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointment_types_duration_check" CHECK ("appointment_types"."duration_minutes" >= 5 AND "appointment_types"."duration_minutes" <= 480),
	CONSTRAINT "appointment_types_buffer_before_check" CHECK ("appointment_types"."buffer_before_minutes" >= 0 AND "appointment_types"."buffer_before_minutes" <= 240),
	CONSTRAINT "appointment_types_buffer_after_check" CHECK ("appointment_types"."buffer_after_minutes" >= 0 AND "appointment_types"."buffer_after_minutes" <= 240),
	CONSTRAINT "appointment_types_slot_step_check" CHECK ("appointment_types"."slot_step_minutes" >= 5 AND "appointment_types"."slot_step_minutes" <= 120)
);
--> statement-breakpoint
CREATE TABLE "practitioner_availability_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"practitioner_id" text NOT NULL,
	"location_id" text NOT NULL,
	"weekday" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"valid_from" date NOT NULL,
	"valid_until" date,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_rules_weekday_check" CHECK ("practitioner_availability_rules"."weekday" BETWEEN 0 AND 6),
	CONSTRAINT "availability_rules_time_check" CHECK ("practitioner_availability_rules"."start_time" < "practitioner_availability_rules"."end_time"),
	CONSTRAINT "availability_rules_valid_until_check" CHECK ("practitioner_availability_rules"."valid_until" IS NULL OR "practitioner_availability_rules"."valid_until" >= "practitioner_availability_rules"."valid_from")
);
--> statement-breakpoint
CREATE TABLE "practitioner_availability_exceptions" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"practitioner_id" text NOT NULL,
	"location_id" text NOT NULL,
	"local_date" date NOT NULL,
	"kind" text NOT NULL,
	"start_time" time,
	"end_time" time,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_exceptions_kind_check" CHECK ("practitioner_availability_exceptions"."kind" IN ('open', 'closed')),
	CONSTRAINT "availability_exceptions_time_check" CHECK (("practitioner_availability_exceptions"."start_time" IS NULL AND "practitioner_availability_exceptions"."end_time" IS NULL) OR ("practitioner_availability_exceptions"."start_time" IS NOT NULL AND "practitioner_availability_exceptions"."end_time" IS NOT NULL AND "practitioner_availability_exceptions"."start_time" < "practitioner_availability_exceptions"."end_time"))
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"practitioner_id" text NOT NULL,
	"appointment_type_id" text NOT NULL,
	"location_id" text NOT NULL,
	"room_id" text,
	"created_by_user_id" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"occupancy_starts_at" timestamp with time zone NOT NULL,
	"occupancy_ends_at" timestamp with time zone NOT NULL,
	"timezone" text NOT NULL,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_status_check" CHECK ("appointments"."status" IN ('scheduled')),
	CONSTRAINT "appointments_time_check" CHECK ("appointments"."starts_at" < "appointments"."ends_at"),
	CONSTRAINT "appointments_occupancy_starts_check" CHECK ("appointments"."occupancy_starts_at" <= "appointments"."starts_at"),
	CONSTRAINT "appointments_occupancy_ends_check" CHECK ("appointments"."occupancy_ends_at" >= "appointments"."ends_at"),
	CONSTRAINT "appointments_occupancy_order_check" CHECK ("appointments"."occupancy_starts_at" < "appointments"."occupancy_ends_at")
);
--> statement-breakpoint
CREATE INDEX "appointment_types_organization_id_idx" ON "appointment_types" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_types_org_id_unique" ON "appointment_types" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "appointment_types_org_name_unique" ON "appointment_types" USING btree ("organization_id","name");
--> statement-breakpoint
CREATE INDEX "availability_rules_org_practitioner_idx" ON "practitioner_availability_rules" USING btree ("organization_id","practitioner_id");
--> statement-breakpoint
CREATE INDEX "availability_rules_org_location_idx" ON "practitioner_availability_rules" USING btree ("organization_id","location_id");
--> statement-breakpoint
CREATE INDEX "availability_rules_lookup_idx" ON "practitioner_availability_rules" USING btree ("organization_id","practitioner_id","location_id","weekday");
--> statement-breakpoint
CREATE UNIQUE INDEX "availability_rules_org_id_unique" ON "practitioner_availability_rules" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "availability_rules_unique_slot" ON "practitioner_availability_rules" USING btree ("organization_id","practitioner_id","location_id","weekday","valid_from","start_time","end_time");
--> statement-breakpoint
CREATE INDEX "availability_exceptions_org_practitioner_date_idx" ON "practitioner_availability_exceptions" USING btree ("organization_id","practitioner_id","local_date");
--> statement-breakpoint
CREATE INDEX "availability_exceptions_org_location_date_idx" ON "practitioner_availability_exceptions" USING btree ("organization_id","location_id","local_date");
--> statement-breakpoint
CREATE UNIQUE INDEX "availability_exceptions_org_id_unique" ON "practitioner_availability_exceptions" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE INDEX "appointments_organization_start_idx" ON "appointments" USING btree ("organization_id","starts_at");
--> statement-breakpoint
CREATE INDEX "appointments_practitioner_start_idx" ON "appointments" USING btree ("organization_id","practitioner_id","starts_at");
--> statement-breakpoint
CREATE INDEX "appointments_patient_start_idx" ON "appointments" USING btree ("organization_id","patient_id","starts_at");
--> statement-breakpoint
CREATE INDEX "appointments_location_start_idx" ON "appointments" USING btree ("organization_id","location_id","starts_at");
--> statement-breakpoint
CREATE INDEX "appointments_room_start_idx" ON "appointments" USING btree ("organization_id","room_id","starts_at");
--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_org_id_unique" ON "appointments" USING btree ("id","organization_id");
--> statement-breakpoint
ALTER TABLE "appointment_types" ADD CONSTRAINT "appointment_types_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "practitioner_availability_rules" ADD CONSTRAINT "practitioner_availability_rules_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "practitioner_availability_rules" ADD CONSTRAINT "availability_rules_practitioner_location_fk" FOREIGN KEY ("organization_id","practitioner_id","location_id") REFERENCES "public"."practitioner_locations"("organization_id","practitioner_id","location_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "practitioner_availability_exceptions" ADD CONSTRAINT "practitioner_availability_exceptions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "practitioner_availability_exceptions" ADD CONSTRAINT "availability_exceptions_practitioner_location_fk" FOREIGN KEY ("organization_id","practitioner_id","location_id") REFERENCES "public"."practitioner_locations"("organization_id","practitioner_id","location_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_fk" FOREIGN KEY ("patient_id","organization_id") REFERENCES "public"."patient_profiles"("id","organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practitioner_fk" FOREIGN KEY ("practitioner_id","organization_id") REFERENCES "public"."practice_practitioners"("id","organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_appointment_type_fk" FOREIGN KEY ("appointment_type_id","organization_id") REFERENCES "public"."appointment_types"("id","organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_location_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."practice_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practitioner_location_fk" FOREIGN KEY ("organization_id","practitioner_id","location_id") REFERENCES "public"."practitioner_locations"("organization_id","practitioner_id","location_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_room_fk" FOREIGN KEY ("room_id","location_id","organization_id") REFERENCES "public"."practice_rooms"("id","location_id","organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_created_by_user_fk" FOREIGN KEY ("created_by_user_id","organization_id") REFERENCES "public"."users"("id","organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_practitioner_no_overlap" EXCLUDE USING gist ("organization_id" WITH =, "practitioner_id" WITH =, tstzrange("occupancy_starts_at", "occupancy_ends_at", '[)') WITH &&) WHERE ("status" = 'scheduled');
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_no_overlap" EXCLUDE USING gist ("organization_id" WITH =, "patient_id" WITH =, tstzrange("starts_at", "ends_at", '[)') WITH &&) WHERE ("status" = 'scheduled');
--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_room_no_overlap" EXCLUDE USING gist ("organization_id" WITH =, "room_id" WITH =, tstzrange("occupancy_starts_at", "occupancy_ends_at", '[)') WITH &&) WHERE ("status" = 'scheduled' AND "room_id" IS NOT NULL);
--> statement-breakpoint
ALTER TABLE "appointment_types" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "practitioner_availability_rules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "practitioner_availability_exceptions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "appointments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "appointment_types_tenant_isolation" ON "appointment_types"
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
);
--> statement-breakpoint
CREATE POLICY "practitioner_availability_rules_tenant_isolation" ON "practitioner_availability_rules"
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
);
--> statement-breakpoint
CREATE POLICY "practitioner_availability_exceptions_tenant_isolation" ON "practitioner_availability_exceptions"
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
);
--> statement-breakpoint
CREATE POLICY "appointments_tenant_isolation" ON "appointments"
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
);
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "appointment_types", "practitioner_availability_rules", "practitioner_availability_exceptions", "appointments" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "appointment_types", "practitioner_availability_rules", "practitioner_availability_exceptions", "appointments" TO authenticated;