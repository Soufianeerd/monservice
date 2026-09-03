CREATE TABLE "patient_profiles" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"birth_name" text NOT NULL,
	"first_birth_name" text NOT NULL,
	"birth_first_names" text,
	"used_name" text,
	"used_first_name" text,
	"birth_date" date NOT NULL,
	"sex" text NOT NULL,
	"birth_place" text,
	"birth_place_code" text,
	"birth_country" text,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"postal_code" text,
	"country" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_profiles_sex_check" CHECK ("patient_profiles"."sex" IN ('female', 'male', 'indeterminate', 'unknown'))
);
--> statement-breakpoint
CREATE TABLE "patient_representatives" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"address" text,
	"city" text,
	"postal_code" text,
	"country" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patient_representative_links" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"patient_id" text NOT NULL,
	"representative_id" text NOT NULL,
	"relationship" text NOT NULL,
	"is_legal_representative" boolean DEFAULT false NOT NULL,
	"is_primary_contact" boolean DEFAULT false NOT NULL,
	"is_emergency_contact" boolean DEFAULT false NOT NULL,
	"is_billing_contact" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patient_rep_links_relationship_check" CHECK ("patient_representative_links"."relationship" IN ('parent', 'legal_guardian', 'spouse_partner', 'adult_child', 'sibling', 'caregiver', 'other'))
);
--> statement-breakpoint
CREATE INDEX "patient_profiles_organization_id_idx" ON "patient_profiles" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "patient_profiles_org_id_unique" ON "patient_profiles" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE INDEX "patient_profiles_org_birth_name_idx" ON "patient_profiles" USING btree ("organization_id","birth_name");
--> statement-breakpoint
CREATE INDEX "patient_profiles_org_birth_date_idx" ON "patient_profiles" USING btree ("organization_id","birth_date");
--> statement-breakpoint
CREATE INDEX "patient_representatives_organization_id_idx" ON "patient_representatives" USING btree ("organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "patient_representatives_org_id_unique" ON "patient_representatives" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE INDEX "patient_rep_links_org_patient_idx" ON "patient_representative_links" USING btree ("organization_id","patient_id");
--> statement-breakpoint
CREATE INDEX "patient_rep_links_org_representative_idx" ON "patient_representative_links" USING btree ("organization_id","representative_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "patient_rep_links_assignment_unique" ON "patient_representative_links" USING btree ("organization_id","patient_id","representative_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "patient_rep_links_primary_active_idx" ON "patient_representative_links" USING btree ("organization_id","patient_id") WHERE "patient_representative_links"."is_primary_contact" = true AND "patient_representative_links"."is_active" = true;
--> statement-breakpoint
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_representatives" ADD CONSTRAINT "patient_representatives_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_representative_links" ADD CONSTRAINT "patient_representative_links_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_representative_links" ADD CONSTRAINT "patient_rep_links_patient_fk" FOREIGN KEY ("patient_id","organization_id") REFERENCES "public"."patient_profiles"("id","organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_representative_links" ADD CONSTRAINT "patient_rep_links_representative_fk" FOREIGN KEY ("representative_id","organization_id") REFERENCES "public"."patient_representatives"("id","organization_id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "patient_profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "patient_representatives" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "patient_representative_links" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "patient_profiles_tenant_isolation" ON "patient_profiles"
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
CREATE POLICY "patient_representatives_tenant_isolation" ON "patient_representatives"
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
CREATE POLICY "patient_representative_links_tenant_isolation" ON "patient_representative_links"
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
REVOKE ALL PRIVILEGES ON TABLE "patient_profiles" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "patient_representatives" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL PRIVILEGES ON TABLE "patient_representative_links" FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "patient_profiles" TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "patient_representatives" TO authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE "patient_representative_links" TO authenticated;