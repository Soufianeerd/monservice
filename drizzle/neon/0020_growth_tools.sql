-- Outils de croissance : paiement saisi par le professionnel, relances
-- automatiques réelles, avis clients vérifiés et vitrine publique.
--
-- Additif. Une seule colonne ajoutée à une table existante
-- (invoices.payment_method). Aucune donnée existante n'est modifiée.
--
-- Principes :
--  - toute écriture sur les nouvelles tables passe par des fonctions bornées ;
--    le rôle runtime n'a qu'un droit de lecture, filtré par organisation ;
--  - les relances et demandes d'avis automatiques sont désactivées par défaut :
--    seul un administrateur de l'organisation les active ;
--  - un avis ne peut naître que d'un lien à usage unique, lié à une facture
--    réglée de l'organisation ; le professionnel ne peut ni le modifier ni le
--    masquer, seulement y répondre ou le signaler ;
--  - le secteur santé est exclu (relances, avis, vitrine) : les règles
--    déontologiques et l'hébergement HDS doivent être tranchés d'abord.

-- 0. Lecture tolérante des dates ISO stockées en texte.
CREATE FUNCTION public.try_iso_date(p_value text)
 RETURNS date
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF p_value IS NULL OR p_value !~ '^\d{4}-\d{2}-\d{2}' THEN
    RETURN NULL;
  END IF;
  RETURN left(p_value, 10)::date;
EXCEPTION WHEN others THEN
  RETURN NULL;
END;
$function$;
REVOKE ALL ON FUNCTION public.try_iso_date(text) FROM PUBLIC;

CREATE FUNCTION public.organization_growth_allowed(p_organization_id text)
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
       AND o.sector IS DISTINCT FROM 'health'
  );
$function$;
REVOKE ALL ON FUNCTION public.organization_growth_allowed(text) FROM PUBLIC;

-- 1. Mode de règlement d'une facture payée hors Stripe.
ALTER TABLE public.invoices ADD COLUMN payment_method text;
ALTER TABLE public.invoices ADD CONSTRAINT invoices_payment_method_check
  CHECK (payment_method IS NULL OR payment_method IN ('transfer', 'check', 'cash', 'card', 'direct_debit', 'other', 'stripe'));

-- 2. Réglages d'automatisation, un enregistrement par organisation.
CREATE TABLE public.organization_automation_settings (
  organization_id text PRIMARY KEY REFERENCES public.organizations(id),
  invoice_reminders_enabled boolean NOT NULL DEFAULT false,
  quote_followups_enabled boolean NOT NULL DEFAULT false,
  quote_followup_days integer NOT NULL DEFAULT 7,
  review_requests_enabled boolean NOT NULL DEFAULT false,
  review_request_delay_days integer NOT NULL DEFAULT 3,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by_user_id text REFERENCES public.users(id),
  CONSTRAINT organization_automation_settings_quote_days_check CHECK (quote_followup_days BETWEEN 3 AND 30),
  CONSTRAINT organization_automation_settings_review_delay_check CHECK (review_request_delay_days BETWEEN 0 AND 30)
);
ALTER TABLE public.organization_automation_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_automation_settings FROM PUBLIC;
GRANT SELECT ON public.organization_automation_settings TO monservice_runtime;
CREATE POLICY "account_active_required" ON public.organization_automation_settings AS RESTRICTIVE FOR ALL TO monservice_runtime
  USING (current_account_is_active()) WITH CHECK (current_account_is_active());
CREATE POLICY "organization_automation_settings_member_read" ON public.organization_automation_settings AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (current_profile_type() = 'professional' AND organization_id = current_organization_id());

CREATE FUNCTION public.save_automation_settings(
  p_invoice_reminders boolean,
  p_quote_followups boolean,
  p_quote_followup_days integer,
  p_review_requests boolean,
  p_review_request_delay_days integer
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_org text := public.current_organization_id();
BEGIN
  IF NOT public.current_user_is_organization_admin() THEN
    RAISE EXCEPTION 'Organization admin required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.organization_growth_allowed(v_org) THEN
    RAISE EXCEPTION 'Automation unavailable for this sector' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.organization_automation_settings AS s (
    organization_id, invoice_reminders_enabled, quote_followups_enabled, quote_followup_days,
    review_requests_enabled, review_request_delay_days, updated_at, updated_by_user_id)
  VALUES (v_org, coalesce(p_invoice_reminders, false), coalesce(p_quote_followups, false), coalesce(p_quote_followup_days, 7),
          coalesce(p_review_requests, false), coalesce(p_review_request_delay_days, 3), now(), public.current_app_user_id()::text)
  ON CONFLICT (organization_id) DO UPDATE SET
    invoice_reminders_enabled = EXCLUDED.invoice_reminders_enabled,
    quote_followups_enabled = EXCLUDED.quote_followups_enabled,
    quote_followup_days = EXCLUDED.quote_followup_days,
    review_requests_enabled = EXCLUDED.review_requests_enabled,
    review_request_delay_days = EXCLUDED.review_request_delay_days,
    updated_at = now(),
    updated_by_user_id = EXCLUDED.updated_by_user_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.save_automation_settings(boolean, boolean, integer, boolean, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_automation_settings(boolean, boolean, integer, boolean, integer) TO monservice_runtime;

-- 3. Journal des envois automatiques : une relance d'un niveau donné ne part
-- qu'une fois par document, même si la tâche planifiée tourne plusieurs fois.
CREATE TABLE public.automation_deliveries (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id text NOT NULL,
  document_id text NOT NULL,
  kind text NOT NULL,
  level integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'claimed',
  claimed_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  CONSTRAINT automation_deliveries_kind_check CHECK (kind IN ('invoice_overdue', 'quote_followup', 'review_request')),
  CONSTRAINT automation_deliveries_level_check CHECK (level BETWEEN 1 AND 3),
  CONSTRAINT automation_deliveries_status_check CHECK (status IN ('claimed', 'sent', 'failed', 'skipped')),
  CONSTRAINT automation_deliveries_document_fk FOREIGN KEY (document_id, organization_id) REFERENCES public.invoices(id, organization_id)
);
CREATE UNIQUE INDEX automation_deliveries_once ON public.automation_deliveries USING btree (document_id, kind, level);
CREATE INDEX automation_deliveries_org_idx ON public.automation_deliveries USING btree (organization_id, claimed_at);
ALTER TABLE public.automation_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.automation_deliveries FROM PUBLIC;
GRANT SELECT ON public.automation_deliveries TO monservice_runtime;
CREATE POLICY "account_active_required" ON public.automation_deliveries AS RESTRICTIVE FOR ALL TO monservice_runtime
  USING (current_account_is_active()) WITH CHECK (current_account_is_active());
CREATE POLICY "automation_deliveries_member_read" ON public.automation_deliveries AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (current_profile_type() = 'professional' AND organization_id = current_organization_id());

-- 4. Demandes d'avis. Le jeton n'est jamais stocké : seule son empreinte.
CREATE TABLE public.client_review_requests (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id text NOT NULL REFERENCES public.organizations(id),
  invoice_id text NOT NULL,
  client_id text NOT NULL,
  email text NOT NULL,
  token_hash text NOT NULL,
  created_by_user_id text REFERENCES public.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  revoked_at timestamp with time zone,
  CONSTRAINT client_review_requests_token_hash_check CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  CONSTRAINT client_review_requests_email_check CHECK (char_length(email) BETWEEN 3 AND 320 AND position('@' IN email) > 1),
  CONSTRAINT client_review_requests_expiry_check CHECK (expires_at > created_at),
  CONSTRAINT client_review_requests_final_state_check CHECK (used_at IS NULL OR revoked_at IS NULL),
  CONSTRAINT client_review_requests_invoice_fk FOREIGN KEY (invoice_id, organization_id, client_id) REFERENCES public.invoices(id, organization_id, client_id)
);
CREATE UNIQUE INDEX client_review_requests_token_unique ON public.client_review_requests USING btree (token_hash);
CREATE UNIQUE INDEX client_review_requests_invoice_live ON public.client_review_requests USING btree (invoice_id) WHERE revoked_at IS NULL;
CREATE INDEX client_review_requests_org_idx ON public.client_review_requests USING btree (organization_id, created_at);
ALTER TABLE public.client_review_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_review_requests FROM PUBLIC;
GRANT SELECT ON public.client_review_requests TO monservice_runtime;
CREATE POLICY "account_active_required" ON public.client_review_requests AS RESTRICTIVE FOR ALL TO monservice_runtime
  USING (current_account_is_active()) WITH CHECK (current_account_is_active());
CREATE POLICY "client_review_requests_member_read" ON public.client_review_requests AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (current_profile_type() = 'professional' AND organization_id = current_organization_id());

-- 5. Avis publiés. Note et commentaire immuables ; réponse et signalement
-- seulement, par des fonctions dédiées. Le masquage relève de la modération
-- MonService (rôle propriétaire), jamais du professionnel noté.
CREATE TABLE public.client_reviews (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id text NOT NULL REFERENCES public.organizations(id),
  request_id text NOT NULL REFERENCES public.client_review_requests(id),
  invoice_id text NOT NULL,
  rating smallint NOT NULL,
  comment text,
  author_display_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reply text,
  replied_at timestamp with time zone,
  replied_by_user_id text REFERENCES public.users(id),
  reported_at timestamp with time zone,
  report_reason text,
  hidden_at timestamp with time zone,
  hidden_reason text,
  CONSTRAINT client_reviews_rating_check CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT client_reviews_comment_check CHECK (comment IS NULL OR char_length(comment) <= 2000),
  CONSTRAINT client_reviews_author_check CHECK (char_length(btrim(author_display_name)) BETWEEN 1 AND 60),
  CONSTRAINT client_reviews_reply_check CHECK (reply IS NULL OR char_length(reply) BETWEEN 1 AND 2000),
  CONSTRAINT client_reviews_report_check CHECK (report_reason IS NULL OR report_reason IN ('abusive', 'personal_data', 'not_a_client', 'off_topic')),
  CONSTRAINT client_reviews_invoice_fk FOREIGN KEY (invoice_id, organization_id) REFERENCES public.invoices(id, organization_id)
);
CREATE UNIQUE INDEX client_reviews_request_unique ON public.client_reviews USING btree (request_id);
CREATE INDEX client_reviews_org_idx ON public.client_reviews USING btree (organization_id, created_at);
ALTER TABLE public.client_reviews ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.client_reviews FROM PUBLIC;
GRANT SELECT ON public.client_reviews TO monservice_runtime;
CREATE POLICY "account_active_required" ON public.client_reviews AS RESTRICTIVE FOR ALL TO monservice_runtime
  USING (current_account_is_active()) WITH CHECK (current_account_is_active());
CREATE POLICY "client_reviews_member_read" ON public.client_reviews AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (current_profile_type() = 'professional' AND organization_id = current_organization_id());

-- Création d'une demande, commune au professionnel et à l'automatisation.
CREATE FUNCTION public.issue_client_review_request(p_organization_id text, p_invoice_id text, p_token_hash text, p_created_by text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_invoice public.invoices;
  v_email text;
  v_id text;
BEGIN
  IF NOT public.organization_growth_allowed(p_organization_id) THEN
    RAISE EXCEPTION 'Reviews unavailable for this sector' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_invoice FROM public.invoices
   WHERE id = p_invoice_id AND organization_id = p_organization_id FOR UPDATE;
  IF v_invoice.id IS NULL OR v_invoice.type <> 'invoice' THEN
    RAISE EXCEPTION 'Invoice not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_invoice.status <> 'paid' THEN
    RAISE EXCEPTION 'Invoice must be paid' USING ERRCODE = '22023';
  END IF;
  SELECT nullif(lower(btrim(coalesce(c.email, c.contact_email))), '') INTO v_email
    FROM public.clients c WHERE c.id = v_invoice.client_id AND c.organization_id = p_organization_id;
  IF v_email IS NULL THEN
    RAISE EXCEPTION 'Client email required' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM public.client_review_requests r WHERE r.invoice_id = p_invoice_id AND r.revoked_at IS NULL) THEN
    RAISE EXCEPTION 'Review already requested' USING ERRCODE = '23505';
  END IF;
  INSERT INTO public.client_review_requests (organization_id, invoice_id, client_id, email, token_hash, created_by_user_id, created_at, expires_at)
  VALUES (p_organization_id, p_invoice_id, v_invoice.client_id, v_email, p_token_hash, p_created_by, now(), now() + interval '30 days')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.issue_client_review_request(text, text, text, text) FROM PUBLIC;

CREATE FUNCTION public.request_client_review(p_invoice_id text, p_token_hash text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF public.current_profile_type() IS DISTINCT FROM 'professional' OR NOT public.current_account_is_active()
     OR public.current_organization_id() IS NULL THEN
    RAISE EXCEPTION 'A professional account is required' USING ERRCODE = '42501';
  END IF;
  RETURN public.issue_client_review_request(public.current_organization_id(), p_invoice_id, p_token_hash, public.current_app_user_id()::text);
END;
$function$;
REVOKE ALL ON FUNCTION public.request_client_review(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_client_review(text, text) TO monservice_runtime;

CREATE FUNCTION public.revoke_client_review_request(p_request_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF public.current_profile_type() IS DISTINCT FROM 'professional' OR NOT public.current_account_is_active() THEN
    RAISE EXCEPTION 'A professional account is required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.client_review_requests SET revoked_at = now()
   WHERE id = p_request_id AND organization_id = public.current_organization_id()
     AND used_at IS NULL AND revoked_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review request unavailable' USING ERRCODE = 'P0002';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.revoke_client_review_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_client_review_request(text) TO monservice_runtime;

-- Aperçu et dépôt par le titulaire du lien, sans compte : le jeton est le secret.
CREATE FUNCTION public.preview_client_review_request(p_token_hash text)
 RETURNS TABLE(organization_name text, invoice_number text, invoice_date text, suggested_name text, state text)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT o.name, i.number, i.date,
         CASE WHEN c.contact_first_name IS NOT NULL AND btrim(c.contact_first_name) <> ''
              THEN btrim(c.contact_first_name) || coalesce(' ' || left(nullif(btrim(c.contact_last_name), ''), 1) || '.', '')
              ELSE split_part(btrim(c.name), ' ', 1) END,
         CASE
           WHEN r.revoked_at IS NOT NULL THEN 'revoked'
           WHEN r.used_at IS NOT NULL THEN 'used'
           WHEN r.expires_at <= now() THEN 'expired'
           ELSE 'pending'
         END
    FROM public.client_review_requests r
    JOIN public.organizations o ON o.id = r.organization_id
    JOIN public.invoices i ON i.id = r.invoice_id AND i.organization_id = r.organization_id
    JOIN public.clients c ON c.id = r.client_id AND c.organization_id = r.organization_id
   WHERE r.token_hash = p_token_hash;
$function$;
REVOKE ALL ON FUNCTION public.preview_client_review_request(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.preview_client_review_request(text) TO monservice_runtime;

CREATE FUNCTION public.submit_client_review(p_token_hash text, p_rating integer, p_comment text, p_display_name text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  req public.client_review_requests;
  v_id text;
BEGIN
  SELECT * INTO req FROM public.client_review_requests WHERE token_hash = p_token_hash FOR UPDATE;
  IF req.id IS NULL OR req.used_at IS NOT NULL OR req.revoked_at IS NOT NULL OR req.expires_at <= now() THEN
    RAISE EXCEPTION 'Review request unavailable' USING ERRCODE = 'P0002';
  END IF;
  IF NOT public.organization_growth_allowed(req.organization_id) THEN
    RAISE EXCEPTION 'Reviews unavailable for this sector' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.client_reviews (organization_id, request_id, invoice_id, rating, comment, author_display_name, created_at)
  VALUES (req.organization_id, req.id, req.invoice_id, p_rating, nullif(btrim(p_comment), ''), btrim(p_display_name), now())
  RETURNING id INTO v_id;
  UPDATE public.client_review_requests SET used_at = now() WHERE id = req.id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.submit_client_review(text, integer, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_client_review(text, integer, text, text) TO monservice_runtime;

CREATE FUNCTION public.reply_client_review(p_review_id text, p_reply text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT public.current_user_is_organization_admin() THEN
    RAISE EXCEPTION 'Organization admin required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.client_reviews
     SET reply = nullif(btrim(p_reply), ''),
         replied_at = CASE WHEN nullif(btrim(p_reply), '') IS NULL THEN NULL ELSE now() END,
         replied_by_user_id = CASE WHEN nullif(btrim(p_reply), '') IS NULL THEN NULL ELSE public.current_app_user_id()::text END
   WHERE id = p_review_id AND organization_id = public.current_organization_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found' USING ERRCODE = 'P0002';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.reply_client_review(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reply_client_review(text, text) TO monservice_runtime;

CREATE FUNCTION public.report_client_review(p_review_id text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT public.current_user_is_organization_admin() THEN
    RAISE EXCEPTION 'Organization admin required' USING ERRCODE = '42501';
  END IF;
  UPDATE public.client_reviews SET reported_at = now(), report_reason = p_reason
   WHERE id = p_review_id AND organization_id = public.current_organization_id() AND reported_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Review not found or already reported' USING ERRCODE = 'P0002';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.report_client_review(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.report_client_review(text, text) TO monservice_runtime;

-- 6. Vitrine publique.
CREATE TABLE public.organization_public_profiles (
  organization_id text PRIMARY KEY REFERENCES public.organizations(id),
  slug text NOT NULL,
  published boolean NOT NULL DEFAULT false,
  headline text,
  about text,
  service_area text,
  intervention_cities text[] NOT NULL DEFAULT '{}'::text[],
  services text[] NOT NULL DEFAULT '{}'::text[],
  show_phone boolean NOT NULL DEFAULT false,
  show_email boolean NOT NULL DEFAULT false,
  website text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by_user_id text REFERENCES public.users(id),
  CONSTRAINT organization_public_profiles_slug_check CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) BETWEEN 3 AND 60),
  CONSTRAINT organization_public_profiles_headline_check CHECK (headline IS NULL OR char_length(headline) <= 120),
  CONSTRAINT organization_public_profiles_about_check CHECK (about IS NULL OR char_length(about) <= 4000),
  CONSTRAINT organization_public_profiles_area_check CHECK (service_area IS NULL OR char_length(service_area) <= 300),
  CONSTRAINT organization_public_profiles_cities_check CHECK (cardinality(intervention_cities) <= 30),
  CONSTRAINT organization_public_profiles_services_check CHECK (cardinality(services) <= 20),
  CONSTRAINT organization_public_profiles_website_check CHECK (website IS NULL OR (website ~ '^https://[^\s<>"]+$' AND char_length(website) <= 300))
);
CREATE UNIQUE INDEX organization_public_profiles_slug_unique ON public.organization_public_profiles USING btree (slug);
ALTER TABLE public.organization_public_profiles ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_public_profiles FROM PUBLIC;
GRANT SELECT ON public.organization_public_profiles TO monservice_runtime;
CREATE POLICY "account_active_required" ON public.organization_public_profiles AS RESTRICTIVE FOR ALL TO monservice_runtime
  USING (current_account_is_active()) WITH CHECK (current_account_is_active());
CREATE POLICY "organization_public_profiles_member_read" ON public.organization_public_profiles AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (current_profile_type() = 'professional' AND organization_id = current_organization_id());

CREATE TABLE public.organization_portfolio_items (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id text NOT NULL REFERENCES public.organizations(id),
  title text NOT NULL,
  description text,
  city text,
  completed_on date,
  position integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organization_portfolio_items_title_check CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  CONSTRAINT organization_portfolio_items_description_check CHECK (description IS NULL OR char_length(description) <= 1000),
  CONSTRAINT organization_portfolio_items_city_check CHECK (city IS NULL OR char_length(city) <= 80)
);
CREATE INDEX organization_portfolio_items_org_idx ON public.organization_portfolio_items USING btree (organization_id, position);
ALTER TABLE public.organization_portfolio_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.organization_portfolio_items FROM PUBLIC;
GRANT SELECT ON public.organization_portfolio_items TO monservice_runtime;
CREATE POLICY "account_active_required" ON public.organization_portfolio_items AS RESTRICTIVE FOR ALL TO monservice_runtime
  USING (current_account_is_active()) WITH CHECK (current_account_is_active());
CREATE POLICY "organization_portfolio_items_member_read" ON public.organization_portfolio_items AS PERMISSIVE FOR SELECT TO monservice_runtime
  USING (current_profile_type() = 'professional' AND organization_id = current_organization_id());

CREATE FUNCTION public.save_public_profile(
  p_slug text, p_published boolean, p_headline text, p_about text, p_service_area text,
  p_cities text[], p_services text[], p_show_phone boolean, p_show_email boolean, p_website text
)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_org text := public.current_organization_id();
BEGIN
  IF NOT public.current_user_is_organization_admin() THEN
    RAISE EXCEPTION 'Organization admin required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.organization_growth_allowed(v_org) THEN
    RAISE EXCEPTION 'Public profile unavailable for this sector' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.organization_public_profiles AS p (
    organization_id, slug, published, headline, about, service_area, intervention_cities, services,
    show_phone, show_email, website, updated_at, updated_by_user_id)
  VALUES (v_org, lower(btrim(p_slug)), coalesce(p_published, false), nullif(btrim(p_headline), ''), nullif(btrim(p_about), ''),
          nullif(btrim(p_service_area), ''), coalesce(p_cities, '{}'::text[]), coalesce(p_services, '{}'::text[]),
          coalesce(p_show_phone, false), coalesce(p_show_email, false), nullif(btrim(p_website), ''), now(), public.current_app_user_id()::text)
  ON CONFLICT (organization_id) DO UPDATE SET
    slug = EXCLUDED.slug, published = EXCLUDED.published, headline = EXCLUDED.headline, about = EXCLUDED.about,
    service_area = EXCLUDED.service_area, intervention_cities = EXCLUDED.intervention_cities, services = EXCLUDED.services,
    show_phone = EXCLUDED.show_phone, show_email = EXCLUDED.show_email, website = EXCLUDED.website,
    updated_at = now(), updated_by_user_id = EXCLUDED.updated_by_user_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.save_public_profile(text, boolean, text, text, text, text[], text[], boolean, boolean, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_public_profile(text, boolean, text, text, text, text[], text[], boolean, boolean, text) TO monservice_runtime;

CREATE FUNCTION public.save_portfolio_item(p_id text, p_title text, p_description text, p_city text, p_completed_on date, p_position integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_org text := public.current_organization_id();
  v_id text;
BEGIN
  IF NOT public.current_user_is_organization_admin() THEN
    RAISE EXCEPTION 'Organization admin required' USING ERRCODE = '42501';
  END IF;
  IF NOT public.organization_growth_allowed(v_org) THEN
    RAISE EXCEPTION 'Public profile unavailable for this sector' USING ERRCODE = '42501';
  END IF;
  IF p_id IS NULL THEN
    IF (SELECT count(*) FROM public.organization_portfolio_items WHERE organization_id = v_org) >= 30 THEN
      RAISE EXCEPTION 'Portfolio limit reached' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.organization_portfolio_items (organization_id, title, description, city, completed_on, position)
    VALUES (v_org, btrim(p_title), nullif(btrim(p_description), ''), nullif(btrim(p_city), ''), p_completed_on, coalesce(p_position, 0))
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.organization_portfolio_items
       SET title = btrim(p_title), description = nullif(btrim(p_description), ''), city = nullif(btrim(p_city), ''),
           completed_on = p_completed_on, position = coalesce(p_position, position)
     WHERE id = p_id AND organization_id = v_org
    RETURNING id INTO v_id;
    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Portfolio item not found' USING ERRCODE = 'P0002';
    END IF;
  END IF;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.save_portfolio_item(text, text, text, text, date, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_portfolio_item(text, text, text, text, date, integer) TO monservice_runtime;

CREATE FUNCTION public.delete_portfolio_item(p_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF NOT public.current_user_is_organization_admin() THEN
    RAISE EXCEPTION 'Organization admin required' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.organization_portfolio_items WHERE id = p_id AND organization_id = public.current_organization_id();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Portfolio item not found' USING ERRCODE = 'P0002';
  END IF;
END;
$function$;
REVOKE ALL ON FUNCTION public.delete_portfolio_item(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_portfolio_item(text) TO monservice_runtime;

-- Lecture publique, sans session : uniquement les vitrines publiées, hors santé,
-- et uniquement les champs que le professionnel a choisi d'afficher.
CREATE FUNCTION public.public_professional_profile(p_slug text)
 RETURNS TABLE(
   name text, headline text, about text, service_area text, intervention_cities text[], services text[],
   city text, postal_code text, phone text, email text, website text, sector text, profession text,
   review_count integer, rating_average numeric, updated_at timestamp with time zone
 )
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT o.name, p.headline, p.about, p.service_area, p.intervention_cities, p.services,
         o.city, o.postal_code,
         CASE WHEN p.show_phone THEN o.phone END,
         CASE WHEN p.show_email THEN o.email END,
         p.website, o.sector, o.profession,
         (SELECT count(*)::integer FROM public.client_reviews r WHERE r.organization_id = o.id AND r.hidden_at IS NULL),
         (SELECT round(avg(r.rating)::numeric, 1) FROM public.client_reviews r WHERE r.organization_id = o.id AND r.hidden_at IS NULL),
         p.updated_at
    FROM public.organization_public_profiles p
    JOIN public.organizations o ON o.id = p.organization_id
   WHERE p.slug = lower(p_slug) AND p.published AND public.organization_growth_allowed(o.id);
$function$;
REVOKE ALL ON FUNCTION public.public_professional_profile(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_professional_profile(text) TO monservice_runtime;

CREATE FUNCTION public.public_professional_reviews(p_slug text, p_limit integer DEFAULT 50)
 RETURNS TABLE(author text, rating smallint, comment text, created_at timestamp with time zone, reply text, replied_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT r.author_display_name, r.rating, r.comment, r.created_at, r.reply, r.replied_at
    FROM public.organization_public_profiles p
    JOIN public.client_reviews r ON r.organization_id = p.organization_id AND r.hidden_at IS NULL
   WHERE p.slug = lower(p_slug) AND p.published AND public.organization_growth_allowed(p.organization_id)
   ORDER BY r.created_at DESC
   LIMIT LEAST(GREATEST(coalesce(p_limit, 50), 1), 100);
$function$;
REVOKE ALL ON FUNCTION public.public_professional_reviews(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_professional_reviews(text, integer) TO monservice_runtime;

CREATE FUNCTION public.public_professional_portfolio(p_slug text)
 RETURNS TABLE(title text, description text, city text, completed_on date)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT i.title, i.description, i.city, i.completed_on
    FROM public.organization_public_profiles p
    JOIN public.organization_portfolio_items i ON i.organization_id = p.organization_id
   WHERE p.slug = lower(p_slug) AND p.published AND public.organization_growth_allowed(p.organization_id)
   ORDER BY i.position, i.completed_on DESC NULLS LAST, i.created_at DESC;
$function$;
REVOKE ALL ON FUNCTION public.public_professional_portfolio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_professional_portfolio(text) TO monservice_runtime;

CREATE FUNCTION public.list_public_professional_slugs()
 RETURNS TABLE(slug text, updated_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  SELECT p.slug, p.updated_at FROM public.organization_public_profiles p
   WHERE p.published AND public.organization_growth_allowed(p.organization_id)
   ORDER BY p.updated_at DESC
   LIMIT 5000;
$function$;
REVOKE ALL ON FUNCTION public.list_public_professional_slugs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_professional_slugs() TO monservice_runtime;

-- 7. Automatisations, exécutées par le worker restreint (secret de tâche
-- planifiée vérifié côté serveur). Le worker ne lit que ce que ces fonctions
-- renvoient et n'écrit que par elles.
CREATE FUNCTION public.due_automation_items(p_limit integer DEFAULT 200)
 RETURNS TABLE(
   kind text, level integer, organization_id text, organization_name text, organization_email text,
   payment_details text, document_id text, document_number text, client_name text, client_email text,
   total_ttc numeric, amount_due numeric, reference_date date, days_late integer
 )
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
  WITH candidates AS (
    -- Factures échues : niveau 1 à J+7, 2 à J+15, 3 à J+30. Seul le niveau
    -- atteint est envoyé : activer les relances tard n'envoie pas trois e-mails.
    SELECT 'invoice_overdue'::text AS kind,
           CASE WHEN current_date - public.try_iso_date(i.due_date) >= 30 THEN 3
                WHEN current_date - public.try_iso_date(i.due_date) >= 15 THEN 2
                ELSE 1 END AS level,
           i.id, i.organization_id, i.client_id, i.number, i.total_ttc, i.amount_due,
           public.try_iso_date(i.due_date) AS reference_date,
           current_date - public.try_iso_date(i.due_date) AS days_late
      FROM public.invoices i
      JOIN public.organization_automation_settings s ON s.organization_id = i.organization_id AND s.invoice_reminders_enabled
     WHERE i.type = 'invoice'
       AND i.status IN ('sent', 'viewed', 'overdue', 'pending', 'unpaid', 'partially_paid')
       AND current_date - public.try_iso_date(i.due_date) >= 7
       AND current_date - public.try_iso_date(i.due_date) <= 120
    UNION ALL
    -- Devis envoyés restés sans réponse : une seule relance.
    SELECT 'quote_followup', 1, i.id, i.organization_id, i.client_id, i.number, i.total_ttc, i.amount_due,
           public.try_iso_date(i.date), current_date - public.try_iso_date(i.date)
      FROM public.invoices i
      JOIN public.organization_automation_settings s ON s.organization_id = i.organization_id AND s.quote_followups_enabled
     WHERE i.type = 'quote'
       AND i.status IN ('sent', 'viewed')
       AND current_date - public.try_iso_date(i.date) >= s.quote_followup_days
       AND current_date - public.try_iso_date(i.date) <= 60
       AND (public.try_iso_date(i.valid_until) IS NULL OR public.try_iso_date(i.valid_until) >= current_date)
    UNION ALL
    -- Factures réglées : une demande d'avis, une fois.
    SELECT 'review_request', 1, i.id, i.organization_id, i.client_id, i.number, i.total_ttc, i.amount_due,
           public.try_iso_date(i.paid_at), current_date - public.try_iso_date(i.paid_at)
      FROM public.invoices i
      JOIN public.organization_automation_settings s ON s.organization_id = i.organization_id AND s.review_requests_enabled
     WHERE i.type = 'invoice'
       AND i.status = 'paid'
       AND current_date - public.try_iso_date(i.paid_at) >= s.review_request_delay_days
       AND current_date - public.try_iso_date(i.paid_at) <= 60
       AND NOT EXISTS (SELECT 1 FROM public.client_review_requests r WHERE r.invoice_id = i.id)
  )
  SELECT c.kind, c.level, c.organization_id, o.name, o.email,
         CASE WHEN c.kind = 'invoice_overdue' THEN coalesce(o.bank_details, o.payment_terms) END,
         c.id, c.number, cl.name, nullif(lower(btrim(coalesce(cl.email, cl.contact_email))), ''),
         c.total_ttc, c.amount_due, c.reference_date, c.days_late
    FROM candidates c
    JOIN public.organizations o ON o.id = c.organization_id
    JOIN public.clients cl ON cl.id = c.client_id AND cl.organization_id = c.organization_id
   WHERE public.organization_growth_allowed(c.organization_id)
     AND nullif(btrim(coalesce(cl.email, cl.contact_email)), '') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM public.automation_deliveries d
        WHERE d.document_id = c.id AND d.kind = c.kind AND d.level >= c.level
     )
   ORDER BY c.organization_id, c.kind, c.id
   LIMIT LEAST(GREATEST(coalesce(p_limit, 200), 1), 500);
$function$;
REVOKE ALL ON FUNCTION public.due_automation_items(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.due_automation_items(integer) TO monservice_reminders;

-- Réservation avant envoi : deux exécutions concurrentes ne peuvent pas
-- envoyer la même relance. Renvoie NULL si déjà réservée.
CREATE FUNCTION public.claim_automation_delivery(p_document_id text, p_kind text, p_level integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_org text;
  v_id text;
BEGIN
  SELECT organization_id INTO v_org FROM public.invoices WHERE id = p_document_id;
  IF v_org IS NULL OR NOT public.organization_growth_allowed(v_org) THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.automation_deliveries (organization_id, document_id, kind, level)
  VALUES (v_org, p_document_id, p_kind, p_level)
  ON CONFLICT (document_id, kind, level) DO NOTHING
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;
REVOKE ALL ON FUNCTION public.claim_automation_delivery(text, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_automation_delivery(text, text, integer) TO monservice_reminders;

CREATE FUNCTION public.complete_automation_delivery(p_delivery_id text, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF p_status NOT IN ('sent', 'failed', 'skipped') THEN
    RAISE EXCEPTION 'Invalid delivery status' USING ERRCODE = '22023';
  END IF;
  UPDATE public.automation_deliveries SET status = p_status, completed_at = now()
   WHERE id = p_delivery_id AND status = 'claimed';
END;
$function$;
REVOKE ALL ON FUNCTION public.complete_automation_delivery(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_automation_delivery(text, text) TO monservice_reminders;

CREATE FUNCTION public.issue_automatic_review_request(p_invoice_id text, p_token_hash text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog', 'public'
AS $function$
DECLARE
  v_org text;
BEGIN
  SELECT i.organization_id INTO v_org
    FROM public.invoices i
    JOIN public.organization_automation_settings s ON s.organization_id = i.organization_id AND s.review_requests_enabled
   WHERE i.id = p_invoice_id;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Automatic review requests disabled' USING ERRCODE = '42501';
  END IF;
  RETURN public.issue_client_review_request(v_org, p_invoice_id, p_token_hash, NULL);
END;
$function$;
REVOKE ALL ON FUNCTION public.issue_automatic_review_request(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.issue_automatic_review_request(text, text) TO monservice_reminders;

-- L'ancien service de relance lisait les factures directement ; ces lectures
-- passent désormais par due_automation_items().
REVOKE SELECT ON public.invoices, public.clients FROM monservice_reminders;

-- Le webhook Stripe (rôle restreint monservice_stripe, droits par colonne)
-- renseigne aussi le mode de règlement.
GRANT UPDATE (payment_method) ON public.invoices TO monservice_stripe;
