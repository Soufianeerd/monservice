-- ==============================================================================
-- Migration 0021: Field Service Estimates, Quotes & Lead-to-Cash Foundation
-- ==============================================================================

-- 1. Create billing_document_sequences table
CREATE TABLE IF NOT EXISTS "billing_document_sequences" (
	"organization_id" text NOT NULL,
	"document_type" text NOT NULL,
	"year" integer NOT NULL,
	"last_sequence" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_document_sequences_type_check" CHECK ("billing_document_sequences"."document_type" IN ('invoice', 'quote')),
	CONSTRAINT "billing_document_sequences_seq_check" CHECK ("billing_document_sequences"."last_sequence" >= 0)
);
--> statement-breakpoint

-- 2. Create invoice_sections table
CREATE TABLE IF NOT EXISTS "invoice_sections" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"invoice_id" text NOT NULL,
	"parent_section_id" text,
	"kind" text DEFAULT 'section' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"position" integer DEFAULT 0 NOT NULL,
	"is_optional" boolean DEFAULT false NOT NULL,
	"option_group_key" text,
	"is_selected" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoice_sections_kind_check" CHECK ("invoice_sections"."kind" IN ('lot', 'tranche', 'section', 'option', 'variant'))
);
--> statement-breakpoint

-- 3. Alter field_service_work_orders for quote linkage
ALTER TABLE "field_service_work_orders" ADD COLUMN IF NOT EXISTS "source_quote_id" text;
--> statement-breakpoint

-- 4. Alter invoices with quote & lead-to-cash lifecycle fields
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "created_by_user_id" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "deal_id" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "site_id" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "work_order_id" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "source_quote_id" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "title" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "valid_until" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "accepted_at" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "accepted_by_user_id" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "rejected_at" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "rejected_by_user_id" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "revision_number" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "supersedes_document_id" text;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "invoice_subtype" text DEFAULT 'standard' NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "deposit_mode" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "deposit_rate" numeric(14,2);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "deposit_fixed_amount" numeric(14,2);
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "deposit_amount" numeric(14,2) DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "prepaid_amount" numeric(14,2) DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "amount_due" numeric(14,2) DEFAULT 0 NOT NULL;
--> statement-breakpoint

-- 5. Alter invoice_lines with decimals, organization_id backfill and line metadata
ALTER TABLE "invoice_lines" ALTER COLUMN "quantity" SET DATA TYPE numeric(14,3);
--> statement-breakpoint

-- Add organization_id as nullable first, then backfill safely
ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "organization_id" text;
--> statement-breakpoint

UPDATE "invoice_lines" il
SET "organization_id" = i."organization_id"
FROM "invoices" i
WHERE il."invoice_id" = i."id"
  AND il."organization_id" IS NULL;
--> statement-breakpoint

DO $$
DECLARE
  orphan_count integer;
BEGIN
  SELECT COUNT(*) INTO orphan_count
  FROM "invoice_lines"
  WHERE "organization_id" IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'Cannot migrate: found % orphan invoice_lines without valid invoice organization_id', orphan_count;
  END IF;
END $$;
--> statement-breakpoint

ALTER TABLE "invoice_lines" ALTER COLUMN "organization_id" SET NOT NULL;
--> statement-breakpoint

ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "section_id" text;
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "source_line_id" text;
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "line_type" text DEFAULT 'service' NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "unit_code" text DEFAULT 'unit' NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "position" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "discount_rate" numeric(14,2) DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "unit_cost" numeric(14,2);
--> statement-breakpoint
ALTER TABLE "invoice_lines" ADD COLUMN IF NOT EXISTS "tax_amount" numeric(14,2) DEFAULT 0 NOT NULL;
--> statement-breakpoint

-- 6. Unique Indexes (created before foreign keys)
CREATE UNIQUE INDEX IF NOT EXISTS "deals_id_org_unique" ON "deals" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_id_org_unique" ON "invoices" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoices_id_org_client_unique" ON "invoices" USING btree ("id","organization_id","client_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_sections_id_org_unique" ON "invoice_sections" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_sections_id_org_inv_unique" ON "invoice_sections" USING btree ("id","organization_id","invoice_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "invoice_lines_id_org_unique" ON "invoice_lines" USING btree ("id","organization_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "billing_sequences_pk" ON "billing_document_sequences" USING btree ("organization_id","document_type","year");
--> statement-breakpoint

-- 7. Performance & Filtering Indexes
CREATE INDEX IF NOT EXISTS "invoice_sections_org_inv_idx" ON "invoice_sections" USING btree ("organization_id","invoice_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_sections_org_pos_idx" ON "invoice_sections" USING btree ("organization_id","position");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "field_service_work_orders_org_source_quote_idx" ON "field_service_work_orders" USING btree ("organization_id","source_quote_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_lines_org_inv_idx" ON "invoice_lines" USING btree ("organization_id","invoice_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoice_lines_org_section_idx" ON "invoice_lines" USING btree ("organization_id","section_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_deal_id_idx" ON "invoices" USING btree ("deal_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_site_id_idx" ON "invoices" USING btree ("site_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_work_order_id_idx" ON "invoices" USING btree ("work_order_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_source_quote_id_idx" ON "invoices" USING btree ("source_quote_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices" USING btree ("organization_id","status");
--> statement-breakpoint

-- 8. Foreign Key Constraints (with exact naming)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'billing_document_sequences_organization_id_organizations_id_fk') THEN
    ALTER TABLE "billing_document_sequences" ADD CONSTRAINT "billing_document_sequences_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_sections_organization_id_organizations_id_fk') THEN
    ALTER TABLE "invoice_sections" ADD CONSTRAINT "invoice_sections_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_sections_invoice_fk') THEN
    ALTER TABLE "invoice_sections" ADD CONSTRAINT "invoice_sections_invoice_fk" FOREIGN KEY ("invoice_id","organization_id") REFERENCES "public"."invoices"("id","organization_id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_sections_parent_fk') THEN
    ALTER TABLE "invoice_sections" ADD CONSTRAINT "invoice_sections_parent_fk" FOREIGN KEY ("parent_section_id","organization_id","invoice_id") REFERENCES "public"."invoice_sections"("id","organization_id","invoice_id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'field_service_work_orders_source_quote_fk') THEN
    ALTER TABLE "field_service_work_orders" ADD CONSTRAINT "field_service_work_orders_source_quote_fk" FOREIGN KEY ("source_quote_id","organization_id") REFERENCES "public"."invoices"("id","organization_id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_lines_organization_id_organizations_id_fk') THEN
    ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_lines_invoice_fk') THEN
    ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_invoice_fk" FOREIGN KEY ("invoice_id","organization_id") REFERENCES "public"."invoices"("id","organization_id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_lines_section_fk') THEN
    ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_section_fk" FOREIGN KEY ("section_id","organization_id","invoice_id") REFERENCES "public"."invoice_sections"("id","organization_id","invoice_id") ON DELETE set null ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_lines_source_line_fk') THEN
    ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_source_line_fk" FOREIGN KEY ("source_line_id","organization_id") REFERENCES "public"."invoice_lines"("id","organization_id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_organization_id_organizations_id_fk') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_client_fk') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_fk" FOREIGN KEY ("client_id","organization_id") REFERENCES "public"."clients"("id","organization_id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_deal_fk') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deal_fk" FOREIGN KEY ("deal_id","organization_id") REFERENCES "public"."deals"("id","organization_id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_site_fk') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_site_fk" FOREIGN KEY ("site_id","organization_id","client_id") REFERENCES "public"."field_service_sites"("id","organization_id","client_id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_source_quote_fk') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_source_quote_fk" FOREIGN KEY ("source_quote_id","organization_id") REFERENCES "public"."invoices"("id","organization_id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_supersedes_fk') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_supersedes_fk" FOREIGN KEY ("supersedes_document_id","organization_id") REFERENCES "public"."invoices"("id","organization_id") ON DELETE no action ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint

-- 9. Check Constraints
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_lines_quantity_check') THEN
    ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_quantity_check" CHECK ("invoice_lines"."quantity" > 0);
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_lines_unit_price_check') THEN
    ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_unit_price_check" CHECK ("invoice_lines"."unit_price" >= 0);
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_lines_tax_rate_check') THEN
    ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_tax_rate_check" CHECK ("invoice_lines"."tax_rate" >= 0 AND "invoice_lines"."tax_rate" <= 100);
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_lines_discount_rate_check') THEN
    ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_discount_rate_check" CHECK ("invoice_lines"."discount_rate" >= 0 AND "invoice_lines"."discount_rate" <= 100);
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoice_lines_line_type_check') THEN
    ALTER TABLE "invoice_lines" ADD CONSTRAINT "invoice_lines_line_type_check" CHECK ("invoice_lines"."line_type" IN ('service', 'labor', 'material', 'equipment', 'travel', 'subcontracting', 'other'));
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_subtype_check') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subtype_check" CHECK ("invoices"."invoice_subtype" IN ('standard', 'deposit', 'final'));
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_deposit_mode_check') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deposit_mode_check" CHECK ("invoices"."deposit_mode" IN ('none', 'percentage', 'fixed'));
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_deposit_rate_check') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deposit_rate_check" CHECK ("invoices"."deposit_rate" IS NULL OR ("invoices"."deposit_rate" >= 0 AND "invoices"."deposit_rate" <= 100));
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_deposit_fixed_amount_check') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deposit_fixed_amount_check" CHECK ("invoices"."deposit_fixed_amount" IS NULL OR "invoices"."deposit_fixed_amount" >= 0);
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_deposit_amount_check') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_deposit_amount_check" CHECK ("invoices"."deposit_amount" >= 0);
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_prepaid_amount_check') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_prepaid_amount_check" CHECK ("invoices"."prepaid_amount" >= 0);
  END IF;
END $$;
--> statement-breakpoint

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invoices_amount_due_check') THEN
    ALTER TABLE "invoices" ADD CONSTRAINT "invoices_amount_due_check" CHECK ("invoices"."amount_due" >= 0);
  END IF;
END $$;
--> statement-breakpoint

-- 10. Functions & Triggers

-- Atomic billing document number generator
CREATE OR REPLACE FUNCTION public.allocate_billing_document_number(
  p_organization_id text,
  p_document_type text,
  p_year integer
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next_seq integer;
  v_prefix text;
BEGIN
  IF p_document_type NOT IN ('invoice', 'quote') THEN
    RAISE EXCEPTION 'Invalid document type: %', p_document_type;
  END IF;

  INSERT INTO public.billing_document_sequences (organization_id, document_type, year, last_sequence, updated_at)
  VALUES (p_organization_id, p_document_type, p_year, 1, now())
  ON CONFLICT (organization_id, document_type, year)
  DO UPDATE SET
    last_sequence = public.billing_document_sequences.last_sequence + 1,
    updated_at = now()
  RETURNING last_sequence INTO v_next_seq;

  IF p_document_type = 'invoice' THEN
    v_prefix := 'F-';
  ELSE
    v_prefix := 'D-';
  END IF;

  RETURN v_prefix || p_year::text || '-' || lpad(v_next_seq::text, 4, '0');
END;
$$;
--> statement-breakpoint

-- Document immutability and invariant guard
CREATE OR REPLACE FUNCTION public.enforce_invoice_invariants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_setting('session_replication_role', true) = 'replica' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  -- Prevent hard delete on non-draft or accepted quotes / paid invoices
  IF TG_OP = 'DELETE' THEN
    IF OLD.status NOT IN ('draft') THEN
      RAISE EXCEPTION 'Cannot delete non-draft document (status: %)', OLD.status;
    END IF;
    RETURN OLD;
  END IF;

  -- Protect accepted quote immutability
  IF TG_OP = 'UPDATE' THEN
    IF OLD.status = 'accepted' AND NEW.status != 'accepted' THEN
      RAISE EXCEPTION 'Cannot change status of an accepted quote';
    END IF;

    IF OLD.status = 'accepted' THEN
      IF OLD.total_ht != NEW.total_ht OR
         OLD.total_ttc != NEW.total_ttc OR
         OLD.tax_amount != NEW.tax_amount OR
         OLD.deposit_amount != NEW.deposit_amount OR
         OLD.deposit_rate IS DISTINCT FROM NEW.deposit_rate OR
         OLD.deposit_fixed_amount IS DISTINCT FROM NEW.deposit_fixed_amount OR
         OLD.deposit_mode IS DISTINCT FROM NEW.deposit_mode OR
         OLD.client_id != NEW.client_id OR
         OLD.organization_id != NEW.organization_id OR
         OLD.signature IS DISTINCT FROM NEW.signature THEN
        RAISE EXCEPTION 'Cannot modify financial or signature fields of an accepted quote';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_enforce_invoice_invariants ON public.invoices;
CREATE TRIGGER trg_enforce_invoice_invariants
  BEFORE UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invoice_invariants();
--> statement-breakpoint

-- Child items immutability guard
CREATE OR REPLACE FUNCTION public.enforce_invoice_child_immutability()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
BEGIN
  IF current_setting('session_replication_role', true) = 'replica' THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT status INTO v_status FROM public.invoices WHERE id = NEW.invoice_id;
    IF v_status IN ('accepted', 'paid', 'cancelled', 'superseded') THEN
      RAISE EXCEPTION 'Cannot add items to finalized/accepted document (status: %)', v_status;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    SELECT status INTO v_status FROM public.invoices WHERE id = OLD.invoice_id;
    IF v_status IN ('accepted', 'paid', 'cancelled', 'superseded') THEN
      RAISE EXCEPTION 'Cannot modify items of finalized/accepted document (status: %)', v_status;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT status INTO v_status FROM public.invoices WHERE id = OLD.invoice_id;
    IF v_status IN ('accepted', 'paid', 'cancelled', 'superseded') THEN
      RAISE EXCEPTION 'Cannot delete items from finalized/accepted document (status: %)', v_status;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_enforce_invoice_lines_immutability ON public.invoice_lines;
CREATE TRIGGER trg_enforce_invoice_lines_immutability
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_lines
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invoice_child_immutability();
--> statement-breakpoint

DROP TRIGGER IF EXISTS trg_enforce_invoice_sections_immutability ON public.invoice_sections;
CREATE TRIGGER trg_enforce_invoice_sections_immutability
  BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_invoice_child_immutability();
--> statement-breakpoint

-- 11. Row Level Security & Policies
ALTER TABLE public.billing_document_sequences ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE public.invoice_sections ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint

DROP POLICY IF EXISTS "billing_sequences_tenant_isolation" ON public.billing_document_sequences;
--> statement-breakpoint
CREATE POLICY "billing_sequences_tenant_isolation" ON public.billing_document_sequences
  FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id())
  WITH CHECK (organization_id = public.current_organization_id());
--> statement-breakpoint

DROP POLICY IF EXISTS "invoice_sections_tenant_isolation" ON public.invoice_sections;
--> statement-breakpoint
CREATE POLICY "invoice_sections_tenant_isolation" ON public.invoice_sections
  FOR ALL TO authenticated
  USING (organization_id = public.current_organization_id())
  WITH CHECK (organization_id = public.current_organization_id());
--> statement-breakpoint

DROP POLICY IF EXISTS "invoice_sections_client_recipient_select" ON public.invoice_sections;
--> statement-breakpoint
CREATE POLICY "invoice_sections_client_recipient_select" ON public.invoice_sections
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices i
      WHERE i.id = invoice_sections.invoice_id
        AND (
          i.recipient_user_id = auth.uid()::text
          OR EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = i.client_id
              AND c.user_id = auth.uid()::text
          )
        )
    )
  );
--> statement-breakpoint

-- 12. Strict Grants
REVOKE ALL ON TABLE public.billing_document_sequences FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE ON TABLE public.billing_document_sequences TO authenticated;
--> statement-breakpoint

REVOKE ALL ON TABLE public.invoice_sections FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invoice_sections TO authenticated;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.allocate_billing_document_number(text, text, integer) FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.allocate_billing_document_number(text, text, integer) TO authenticated;
--> statement-breakpoint

REVOKE ALL ON FUNCTION public.enforce_invoice_invariants() FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_invoice_child_immutability() FROM PUBLIC, anon, authenticated;