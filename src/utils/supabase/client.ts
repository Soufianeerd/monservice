import { createBrowserClient } from '@supabase/ssr';

/**
 * Client Supabase côté navigateur.
 *
 * La clé `publishable` est publique par conception — elle est visible dans le
 * bundle. Sa sécurité repose ENTIÈREMENT sur les politiques Row-Level
 * Security : sans RLS, l'API PostgREST est interrogeable directement, en
 * contournant l'application (anomalie MS-022).
 * Voir `drizzle/postgres/0002_supabase_auth_migration.sql`.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error('Configuration Supabase manquante côté client.');
  }

  return createBrowserClient(url, key);
}
