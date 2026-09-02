CREATE TABLE "practice_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"city" text,
	"postal_code" text,
	"country" text,
	"timezone" text NOT NULL,
	"phone" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_practitioners" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text,
	"display_name" text NOT NULL,
	"profession" text NOT NULL,
	"email" text,
	"phone" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "practice_practitioners_profession_check" CHECK ("practice_practitioners"."profession" IN ('physiotherapist', 'osteopath', 'speech_therapist', 'podiatrist', 'occupational_therapist', 'psychomotor_therapist', 'dietitian'))
);
--> statement-breakpoint
CREATE TABLE "practice_resources" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"location_id" text NOT NULL,
	"room_id" text,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practice_rooms" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"location_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "practitioner_locations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"practitioner_id" text NOT NULL,
	"location_id" text NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "practice_locations" ADD CONSTRAINT "practice_locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_practitioners" ADD CONSTRAINT "practice_practitioners_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_practitioners" ADD CONSTRAINT "practice_practitioners_user_fk" FOREIGN KEY ("user_id","organization_id") REFERENCES "public"."users"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_resources" ADD CONSTRAINT "practice_resources_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_resources" ADD CONSTRAINT "practice_resources_location_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."practice_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_resources" ADD CONSTRAINT "practice_resources_room_fk" FOREIGN KEY ("room_id","location_id","organization_id") REFERENCES "public"."practice_rooms"("id","location_id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_rooms" ADD CONSTRAINT "practice_rooms_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practice_rooms" ADD CONSTRAINT "practice_rooms_location_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."practice_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioner_locations" ADD CONSTRAINT "practitioner_locations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioner_locations" ADD CONSTRAINT "practitioner_locations_practitioner_fk" FOREIGN KEY ("practitioner_id","organization_id") REFERENCES "public"."practice_practitioners"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "practitioner_locations" ADD CONSTRAINT "practitioner_locations_location_fk" FOREIGN KEY ("location_id","organization_id") REFERENCES "public"."practice_locations"("id","organization_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "practice_locations_organization_id_idx" ON "practice_locations" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_locations_org_id_unique" ON "practice_locations" USING btree ("id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_locations_primary_active_idx" ON "practice_locations" USING btree ("organization_id") WHERE "practice_locations"."is_primary" = true AND "practice_locations"."is_active" = true;--> statement-breakpoint
CREATE INDEX "practice_practitioners_organization_id_idx" ON "practice_practitioners" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_practitioners_org_id_unique" ON "practice_practitioners" USING btree ("id","organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_practitioners_org_user_unique" ON "practice_practitioners" USING btree ("organization_id","user_id");--> statement-breakpoint
CREATE INDEX "practice_resources_organization_id_idx" ON "practice_resources" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "practice_resources_location_id_idx" ON "practice_resources" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "practice_resources_room_id_idx" ON "practice_resources" USING btree ("room_id");--> statement-breakpoint
CREATE INDEX "practice_rooms_organization_id_idx" ON "practice_rooms" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "practice_rooms_location_id_idx" ON "practice_rooms" USING btree ("location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_rooms_location_name_unique" ON "practice_rooms" USING btree ("location_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "practice_rooms_org_location_id_unique" ON "practice_rooms" USING btree ("id","location_id","organization_id");--> statement-breakpoint
CREATE INDEX "practitioner_locations_org_practitioner_idx" ON "practitioner_locations" USING btree ("organization_id","practitioner_id");--> statement-breakpoint
CREATE INDEX "practitioner_locations_org_location_idx" ON "practitioner_locations" USING btree ("organization_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practitioner_locations_assignment_unique" ON "practitioner_locations" USING btree ("organization_id","practitioner_id","location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "practitioner_locations_primary_active_idx" ON "practitioner_locations" USING btree ("organization_id","practitioner_id") WHERE "practitioner_locations"."is_primary" = true AND "practitioner_locations"."is_active" = true;--> statement-breakpoint
CREATE UNIQUE INDEX "users_id_org_unique" ON "users" USING btree ("id","organization_id");
--> statement-breakpoint
ALTER TABLE "practice_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "practice_practitioners" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "practitioner_locations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "practice_rooms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "practice_resources" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "practice_locations_tenant_isolation" ON "practice_locations"
AS PERMISSIVE FOR ALL
TO authenticated
USING (organization_id = public.current_organization_id())
WITH CHECK (organization_id = public.current_organization_id());
--> statement-breakpoint
CREATE POLICY "practice_practitioners_tenant_isolation" ON "practice_practitioners"
AS PERMISSIVE FOR ALL
TO authenticated
USING (organization_id = public.current_organization_id())
WITH CHECK (
  organization_id = public.current_organization_id() AND
  (
    user_id IS NULL OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = practice_practitioners.user_id 
      AND organization_id = public.current_organization_id() 
      AND profile_type = 'professional'
    )
  )
);
--> statement-breakpoint
CREATE POLICY "practitioner_locations_tenant_isolation" ON "practitioner_locations"
AS PERMISSIVE FOR ALL
TO authenticated
USING (organization_id = public.current_organization_id())
WITH CHECK (organization_id = public.current_organization_id());
--> statement-breakpoint
CREATE POLICY "practice_rooms_tenant_isolation" ON "practice_rooms"
AS PERMISSIVE FOR ALL
TO authenticated
USING (organization_id = public.current_organization_id())
WITH CHECK (organization_id = public.current_organization_id());
--> statement-breakpoint
CREATE POLICY "practice_resources_tenant_isolation" ON "practice_resources"
AS PERMISSIVE FOR ALL
TO authenticated
USING (organization_id = public.current_organization_id())
WITH CHECK (organization_id = public.current_organization_id());
--> statement-breakpoint
REVOKE ALL ON TABLE "practice_locations" FROM PUBLIC;
REVOKE ALL ON TABLE "practice_practitioners" FROM PUBLIC;
REVOKE ALL ON TABLE "practitioner_locations" FROM PUBLIC;
REVOKE ALL ON TABLE "practice_rooms" FROM PUBLIC;
REVOKE ALL ON TABLE "practice_resources" FROM PUBLIC;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "practice_locations" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "practice_practitioners" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "practitioner_locations" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "practice_rooms" TO authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE "practice_resources" TO authenticated;
