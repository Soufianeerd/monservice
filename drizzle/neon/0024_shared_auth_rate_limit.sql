-- 0024 — Limite de tentatives partagée par toutes les instances du serveur.
--
-- Le compteur en mémoire de src/middleware/rate-limit.ts est propre à chaque
-- fonction serverless : un attaquant réparti sur plusieurs instances le
-- contourne. Ce compteur vit dans la base, hors du schéma public (aucune table
-- métier ajoutée, aucun droit direct pour le rôle d'exécution) ; l'application
-- n'y accède que par la fonction ci-dessous.
--
-- Les clés reçues sont déjà hachées par l'application (aucune adresse e-mail
-- ni IP en clair). Migration additive ; le script l'exécute dans une seule
-- transaction.

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC;

CREATE TABLE app_private.auth_rate_limits (
  bucket text NOT NULL CHECK (length(bucket) BETWEEN 1 AND 200),
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0 CHECK (hits >= 0),
  PRIMARY KEY (bucket, window_start)
);
REVOKE ALL ON app_private.auth_rate_limits FROM PUBLIC;
CREATE INDEX auth_rate_limits_window_idx ON app_private.auth_rate_limits (window_start);

-- Enregistre une tentative et indique si elle reste sous la limite.
CREATE FUNCTION public.auth_rate_limit_hit(p_bucket text, p_window_seconds integer, p_max integer) RETURNS boolean
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = pg_catalog, app_private
AS $$
DECLARE
  v_start timestamptz;
  v_hits integer;
BEGIN
  IF p_bucket IS NULL OR length(p_bucket) NOT BETWEEN 1 AND 200
     OR p_window_seconds IS NULL OR p_window_seconds NOT BETWEEN 1 AND 86400
     OR p_max IS NULL OR p_max NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'invalid rate limit request' USING ERRCODE = '22023';
  END IF;
  v_start := to_timestamp(floor(extract(epoch FROM clock_timestamp()) / p_window_seconds) * p_window_seconds);
  INSERT INTO app_private.auth_rate_limits AS r (bucket, window_start, hits)
  VALUES (p_bucket, v_start, 1)
  ON CONFLICT (bucket, window_start) DO UPDATE SET hits = r.hits + 1
  RETURNING r.hits INTO v_hits;
  -- Ménage occasionnel des fenêtres expirées (au-delà de 2 jours).
  IF random() < 0.01 THEN
    DELETE FROM app_private.auth_rate_limits WHERE window_start < clock_timestamp() - interval '2 days';
  END IF;
  RETURN v_hits <= p_max;
END
$$;
REVOKE ALL ON FUNCTION public.auth_rate_limit_hit(text, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.auth_rate_limit_hit(text, integer, integer) TO monservice_runtime;
