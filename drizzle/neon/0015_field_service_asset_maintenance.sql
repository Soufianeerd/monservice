-- Session 19B — maintenance préventive des équipements clients.
-- Additif : deux colonnes facultatives, une contrainte, un trigger.

ALTER TABLE public.field_service_assets
  ADD COLUMN maintenance_interval_months integer,
  ADD COLUMN next_maintenance_on date;

ALTER TABLE public.field_service_assets
  ADD CONSTRAINT field_service_assets_maintenance_interval_check
  CHECK (maintenance_interval_months IS NULL OR (maintenance_interval_months >= 1 AND maintenance_interval_months <= 120));

CREATE INDEX field_service_assets_org_next_maintenance_idx
  ON public.field_service_assets USING btree (organization_id, next_maintenance_on);

-- Quand une opération d'entretien se termine, la prochaine échéance de chaque
-- équipement rattaché (avec une périodicité) est recalculée depuis la date de
-- fin réelle. La mise à jour reste bornée à l'organisation de l'opération.
CREATE FUNCTION public.advance_field_service_asset_maintenance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' AND NEW.work_type = 'maintenance' THEN
    UPDATE public.field_service_assets a
       SET next_maintenance_on = (coalesce(NEW.actual_end, now()) AT TIME ZONE 'Europe/Paris')::date
                                 + make_interval(months => a.maintenance_interval_months)
      FROM public.field_service_work_order_assets l
     WHERE l.work_order_id = NEW.id
       AND l.organization_id = NEW.organization_id
       AND a.id = l.asset_id
       AND a.organization_id = NEW.organization_id
       AND a.maintenance_interval_months IS NOT NULL
       AND a.status <> 'decommissioned';
  END IF;
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.advance_field_service_asset_maintenance() FROM PUBLIC;
CREATE TRIGGER trg_field_service_asset_maintenance_advance
  AFTER UPDATE OF status ON public.field_service_work_orders
  FOR EACH ROW EXECUTE FUNCTION advance_field_service_asset_maintenance();
