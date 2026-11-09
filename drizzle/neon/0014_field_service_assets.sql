-- Session 19 — Customer Assets & Equipment Tracking (Field Service).
-- Additive only: two new tenant tables, one new composite unique index on
-- field_service_work_orders, guards, RLS and least-privilege grants.

-- Lets a link row prove that its work order and its asset share one client.
CREATE UNIQUE INDEX field_service_work_orders_id_org_client_unique
  ON public.field_service_work_orders USING btree (id, organization_id, client_id);

CREATE TABLE public.field_service_assets (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES public.organizations(id),
  client_id text NOT NULL,
  site_id text,
  category text NOT NULL DEFAULT 'other',
  label text NOT NULL,
  manufacturer text,
  model text,
  serial_number text,
  installed_on date,
  warranty_ends_on date,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT field_service_assets_label_check CHECK (char_length(trim(label)) >= 1 AND char_length(trim(label)) <= 160),
  CONSTRAINT field_service_assets_category_check CHECK (category IN ('heating', 'cooling', 'ventilation', 'plumbing', 'electrical', 'appliance', 'security', 'it_equipment', 'vehicle', 'structure', 'other')),
  CONSTRAINT field_service_assets_status_check CHECK (status IN ('active', 'out_of_service', 'decommissioned')),
  CONSTRAINT field_service_assets_serial_check CHECK (serial_number IS NULL OR (char_length(trim(serial_number)) >= 1 AND char_length(serial_number) <= 120)),
  CONSTRAINT field_service_assets_manufacturer_check CHECK (manufacturer IS NULL OR char_length(manufacturer) <= 120),
  CONSTRAINT field_service_assets_model_check CHECK (model IS NULL OR char_length(model) <= 120),
  CONSTRAINT field_service_assets_notes_check CHECK (notes IS NULL OR char_length(notes) <= 4000),
  CONSTRAINT field_service_assets_warranty_dates_check CHECK (installed_on IS NULL OR warranty_ends_on IS NULL OR warranty_ends_on >= installed_on),
  CONSTRAINT field_service_assets_client_fk FOREIGN KEY (client_id, organization_id) REFERENCES public.clients(id, organization_id),
  CONSTRAINT field_service_assets_site_fk FOREIGN KEY (site_id, organization_id, client_id) REFERENCES public.field_service_sites(id, organization_id, client_id)
);
CREATE UNIQUE INDEX field_service_assets_id_org_client_unique ON public.field_service_assets USING btree (id, organization_id, client_id);
CREATE UNIQUE INDEX field_service_assets_org_serial_unique ON public.field_service_assets USING btree (organization_id, manufacturer, serial_number) WHERE (serial_number IS NOT NULL);
CREATE INDEX field_service_assets_org_client_idx ON public.field_service_assets USING btree (organization_id, client_id);
CREATE INDEX field_service_assets_org_site_idx ON public.field_service_assets USING btree (organization_id, site_id);
CREATE INDEX field_service_assets_org_status_idx ON public.field_service_assets USING btree (organization_id, status);
CREATE INDEX field_service_assets_org_warranty_idx ON public.field_service_assets USING btree (organization_id, warranty_ends_on);

CREATE TABLE public.field_service_work_order_assets (
  id text PRIMARY KEY,
  organization_id text NOT NULL REFERENCES public.organizations(id),
  client_id text NOT NULL,
  work_order_id text NOT NULL,
  asset_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT field_service_work_order_assets_work_order_fk FOREIGN KEY (work_order_id, organization_id, client_id) REFERENCES public.field_service_work_orders(id, organization_id, client_id),
  CONSTRAINT field_service_work_order_assets_asset_fk FOREIGN KEY (asset_id, organization_id, client_id) REFERENCES public.field_service_assets(id, organization_id, client_id)
);
CREATE UNIQUE INDEX field_service_work_order_assets_wo_asset_unique ON public.field_service_work_order_assets USING btree (work_order_id, asset_id);
CREATE INDEX field_service_work_order_assets_org_asset_idx ON public.field_service_work_order_assets USING btree (organization_id, asset_id);
CREATE INDEX field_service_work_order_assets_org_wo_idx ON public.field_service_work_order_assets USING btree (organization_id, work_order_id);

-- Identity immutability and terminal decommissioning.
CREATE FUNCTION public.enforce_field_service_asset_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF OLD.id IS DISTINCT FROM NEW.id
     OR OLD.organization_id IS DISTINCT FROM NEW.organization_id
     OR OLD.client_id IS DISTINCT FROM NEW.client_id
     OR OLD.created_at IS DISTINCT FROM NEW.created_at THEN
    RAISE EXCEPTION 'Asset core identity (id, organization_id, client_id, created_at) is immutable' USING ERRCODE = '23514';
  END IF;
  IF OLD.status = 'decommissioned' AND (to_jsonb(NEW) - 'updated_at') IS DISTINCT FROM (to_jsonb(OLD) - 'updated_at') THEN
    RAISE EXCEPTION 'A decommissioned asset is read-only' USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.enforce_field_service_asset_mutation() FROM PUBLIC;
CREATE TRIGGER trg_field_service_asset_mutation BEFORE UPDATE ON public.field_service_assets FOR EACH ROW EXECUTE FUNCTION enforce_field_service_asset_mutation();

-- Links are insert/delete only; a decommissioned asset cannot join new work.
CREATE FUNCTION public.enforce_field_service_work_order_asset_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Work order asset links are immutable; delete and recreate instead' USING ERRCODE = '23514';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.field_service_assets a
    WHERE a.id = NEW.asset_id AND a.organization_id = NEW.organization_id AND a.status = 'decommissioned'
  ) THEN
    RAISE EXCEPTION 'A decommissioned asset cannot be linked to a work order' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.enforce_field_service_work_order_asset_link() FROM PUBLIC;
CREATE TRIGGER trg_field_service_work_order_asset_link BEFORE INSERT OR UPDATE ON public.field_service_work_order_assets FOR EACH ROW EXECUTE FUNCTION enforce_field_service_work_order_asset_link();

-- Same tenant guard as every other table carrying organization_id (0005).
CREATE TRIGGER runtime_immutable_fields BEFORE UPDATE ON public.field_service_assets FOR EACH ROW EXECUTE FUNCTION public.protect_runtime_fields();
CREATE TRIGGER runtime_immutable_fields BEFORE UPDATE ON public.field_service_work_order_assets FOR EACH ROW EXECUTE FUNCTION public.protect_runtime_fields();

-- RLS: Field Service professionals of the owning organization only.
ALTER TABLE public.field_service_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public.field_service_assets AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());
CREATE POLICY "field_service_assets_professional_policy" ON public.field_service_assets AS PERMISSIVE FOR ALL TO monservice_runtime USING (is_current_field_service_professional(organization_id)) WITH CHECK (is_current_field_service_professional(organization_id));

ALTER TABLE public.field_service_work_order_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "account_active_required" ON public.field_service_work_order_assets AS RESTRICTIVE FOR ALL TO monservice_runtime USING (current_account_is_active()) WITH CHECK (current_account_is_active());
CREATE POLICY "field_service_work_order_assets_professional_policy" ON public.field_service_work_order_assets AS PERMISSIVE FOR ALL TO monservice_runtime USING (is_current_field_service_professional(organization_id)) WITH CHECK (is_current_field_service_professional(organization_id));

-- Least privilege: assets are never deleted (decommission instead); links have no UPDATE.
REVOKE ALL ON public.field_service_assets, public.field_service_work_order_assets FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON public.field_service_assets TO monservice_runtime;
GRANT SELECT, INSERT, DELETE ON public.field_service_work_order_assets TO monservice_runtime;
