-- 0021 — Tous les professionnels mettent en valeur leur activité.
--
-- Décision du 19 novembre 2026 : avis vérifiés, relances automatiques et
-- vitrine publique sont ouverts à tous les secteurs, paramédical compris
-- (0020 les réservait aux secteurs hors santé). L'univers santé et bien-être
-- accueille aussi psychologues, coachs, nutritionnistes et praticiens en
-- massage bien-être.
--
-- Migration additive : deux contraintes élargies (aucune ligne existante ne
-- peut les violer, la liste précédente est incluse) et une fonction
-- remplacée à l'identique de signature, droits et propriétaire. Le script
-- de migration exécute ce fichier dans une seule transaction.

ALTER TABLE public.organizations DROP CONSTRAINT organizations_sector_profession_check;
ALTER TABLE public.organizations ADD CONSTRAINT organizations_sector_profession_check CHECK (((((sector = 'health'::text) AND (profession = ANY (ARRAY['physiotherapist'::text, 'osteopath'::text, 'speech_therapist'::text, 'podiatrist'::text, 'occupational_therapist'::text, 'psychomotor_therapist'::text, 'dietitian'::text, 'psychologist'::text, 'sport_coach'::text, 'nutritionist'::text, 'wellness_massage'::text]))) OR ((sector = ANY (ARRAY['field_services'::text, 'artisan'::text])) AND (profession = ANY (ARRAY['mason'::text, 'plumber'::text, 'electrician'::text, 'heating_technician'::text, 'hvac_technician'::text, 'roofer'::text, 'carpenter'::text, 'joiner'::text, 'painter'::text, 'plasterer'::text, 'insulation_specialist'::text, 'tiler'::text, 'earthworks_contractor'::text, 'facade_specialist'::text, 'locksmith'::text, 'glazier'::text, 'sanitation_specialist'::text, 'renovation_contractor'::text, 'pool_specialist'::text, 'architect'::text, 'construction_project_manager'::text, 'engineering_office'::text, 'quantity_surveyor'::text, 'maintenance_technician'::text, 'technical_installer'::text, 'auto_mechanic'::text, 'auto_body_repairer'::text, 'auto_service_center'::text, 'phone_repairer'::text, 'computer_repairer'::text, 'appliance_repairer'::text, 'electronics_repairer'::text, 'landscaper'::text, 'custom_manufacturer'::text, 'artisan_retailer'::text, 'technical_service_provider'::text]))) OR (profession IS NULL)) AND (NOT ((sector IS NULL) AND (profession IS NOT NULL)))));

ALTER TABLE public.practice_practitioners DROP CONSTRAINT practice_practitioners_profession_check;
ALTER TABLE public.practice_practitioners ADD CONSTRAINT practice_practitioners_profession_check CHECK ((profession = ANY (ARRAY['physiotherapist'::text, 'osteopath'::text, 'speech_therapist'::text, 'podiatrist'::text, 'occupational_therapist'::text, 'psychomotor_therapist'::text, 'dietitian'::text, 'psychologist'::text, 'sport_coach'::text, 'nutritionist'::text, 'wellness_massage'::text])));

CREATE OR REPLACE FUNCTION public.organization_growth_allowed(p_organization_id text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.organizations o
     WHERE o.id = p_organization_id
       AND o.profile_type = 'professional'
  );
$function$;
REVOKE ALL ON FUNCTION public.organization_growth_allowed(text) FROM PUBLIC;
