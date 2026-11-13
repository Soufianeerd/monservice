-- Le lien fiche client ↔ compte client (clients.user_id) ne change plus que
-- par les fonctions bornées de 0017 (acceptation par le client, retrait par
-- le professionnel). Avant cette garde, un professionnel pouvait, via le rôle
-- runtime, rattacher n'importe quel compte à une fiche et lui faire voir ses
-- documents. L'INSERT n'est pas concerné (création de fiche depuis l'accès
-- portail patient, V1 paramédicale gelée).
CREATE FUNCTION public.protect_client_portal_link()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'pg_catalog', 'public'
AS $function$
BEGIN
  IF current_user = 'monservice_runtime' AND NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'The client portal link changes only through invitations' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION public.protect_client_portal_link() FROM PUBLIC;
CREATE TRIGGER trg_protect_client_portal_link BEFORE UPDATE OF user_id ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.protect_client_portal_link();
