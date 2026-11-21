-- 0025 — Double authentification (TOTP, RFC 6238) des comptes professionnels.
--
-- Les secrets vivent hors du schéma public, chiffrés par l'application
-- (AES-256-GCM, clé TWO_FACTOR_ENCRYPTION_KEY). Le rôle d'exécution n'a aucun
-- droit sur la table : il ne passe que par les fonctions ci-dessous, qui ne
-- touchent jamais qu'à la ligne de l'utilisateur courant
-- (public.current_app_user_id()). Aucune table métier publique ajoutée.
-- Migration additive ; le script l'exécute dans une seule transaction.

CREATE TABLE app_private.user_two_factor (
  user_id text PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  secret_ciphertext text NOT NULL CHECK (length(secret_ciphertext) BETWEEN 20 AND 400),
  enabled_at timestamptz,
  recovery_code_hashes text[] NOT NULL DEFAULT '{}' CHECK (cardinality(recovery_code_hashes) <= 10),
  last_used_step bigint NOT NULL DEFAULT 0 CHECK (last_used_step >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON app_private.user_two_factor FROM PUBLIC;

CREATE FUNCTION app_private.require_two_factor_user() RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = pg_catalog, public
AS $$
DECLARE v_user text := public.current_app_user_id();
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'authentication required' USING ERRCODE = '42501';
  END IF;
  RETURN v_user;
END
$$;
REVOKE ALL ON FUNCTION app_private.require_two_factor_user() FROM PUBLIC;

-- Double authentification active pour l'utilisateur courant (faux si anonyme).
CREATE FUNCTION public.two_factor_enabled() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app_private, public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM app_private.user_two_factor
    WHERE user_id = public.current_app_user_id() AND enabled_at IS NOT NULL
  )
$$;

-- Secret chiffré (en attente ou actif) de l'utilisateur courant.
CREATE FUNCTION public.two_factor_secret() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog, app_private, public
AS $$
  SELECT secret_ciphertext FROM app_private.user_two_factor
  WHERE user_id = app_private.require_two_factor_user()
$$;

-- Prépare l'activation : refusée si la double authentification est déjà active.
CREATE FUNCTION public.two_factor_set_pending(p_ciphertext text) RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, app_private, public
AS $$
DECLARE v_user text := app_private.require_two_factor_user();
BEGIN
  IF EXISTS (SELECT 1 FROM app_private.user_two_factor WHERE user_id = v_user AND enabled_at IS NOT NULL) THEN
    RAISE EXCEPTION 'two factor already enabled' USING ERRCODE = '22023';
  END IF;
  INSERT INTO app_private.user_two_factor (user_id, secret_ciphertext)
  VALUES (v_user, p_ciphertext)
  ON CONFLICT (user_id) DO UPDATE
    SET secret_ciphertext = excluded.secret_ciphertext, recovery_code_hashes = '{}',
        last_used_step = 0, updated_at = now();
END
$$;

-- Active la double authentification après vérification d'un premier code.
CREATE FUNCTION public.two_factor_activate(p_step bigint, p_recovery_hashes text[]) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, app_private, public
AS $$
DECLARE v_user text := app_private.require_two_factor_user();
BEGIN
  IF p_step IS NULL OR p_step <= 0 OR p_recovery_hashes IS NULL OR cardinality(p_recovery_hashes) NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'invalid two factor activation' USING ERRCODE = '22023';
  END IF;
  UPDATE app_private.user_two_factor
  SET enabled_at = now(), last_used_step = p_step, recovery_code_hashes = p_recovery_hashes, updated_at = now()
  WHERE user_id = v_user AND enabled_at IS NULL;
  RETURN FOUND;
END
$$;

-- Consomme un pas de temps TOTP : un même code ne sert qu'une fois.
CREATE FUNCTION public.two_factor_consume_step(p_step bigint) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, app_private, public
AS $$
DECLARE v_user text := app_private.require_two_factor_user();
BEGIN
  UPDATE app_private.user_two_factor
  SET last_used_step = p_step, updated_at = now()
  WHERE user_id = v_user AND enabled_at IS NOT NULL AND p_step > last_used_step;
  RETURN FOUND;
END
$$;

-- Consomme un code de secours (empreinte fournie par l'application).
CREATE FUNCTION public.two_factor_consume_recovery(p_hash text) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, app_private, public
AS $$
DECLARE v_user text := app_private.require_two_factor_user();
BEGIN
  UPDATE app_private.user_two_factor
  SET recovery_code_hashes = array_remove(recovery_code_hashes, p_hash), updated_at = now()
  WHERE user_id = v_user AND enabled_at IS NOT NULL AND p_hash = ANY (recovery_code_hashes);
  RETURN FOUND;
END
$$;

-- Désactive la double authentification de l'utilisateur courant.
CREATE FUNCTION public.two_factor_disable() RETURNS void
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, app_private, public
AS $$
BEGIN
  DELETE FROM app_private.user_two_factor WHERE user_id = app_private.require_two_factor_user();
END
$$;

REVOKE ALL ON FUNCTION public.two_factor_enabled(), public.two_factor_secret(),
  public.two_factor_set_pending(text), public.two_factor_activate(bigint, text[]),
  public.two_factor_consume_step(bigint), public.two_factor_consume_recovery(text),
  public.two_factor_disable() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.two_factor_enabled(), public.two_factor_secret(),
  public.two_factor_set_pending(text), public.two_factor_activate(bigint, text[]),
  public.two_factor_consume_step(bigint), public.two_factor_consume_recovery(text),
  public.two_factor_disable() TO monservice_runtime;
