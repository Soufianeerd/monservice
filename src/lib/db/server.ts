import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { auth } from '@/lib/auth/server';
import { createSecurityScopedClient } from './security-context';
import { getWorkerAuthority } from './worker-context';

/**
 * Connexion base de données — PostgreSQL uniquement.
 *
 * L'ancienne version basculait sur SQLite lorsque `DATABASE_URL` ne commençait
 * pas par `postgres`. En production, une variable absente ou mal orthographiée
 * créait donc silencieusement une base SQLite dans le système de fichiers
 * éphémère d'une fonction Netlify : données divergentes entre instances et
 * perte totale à chaque redéploiement, sans aucune alerte (anomalie MS-011).
 *
 * Le démarrage échoue désormais bruyamment plutôt que de dégrader en silence.
 */

const databaseUrl = process.env.NEON_RUNTIME_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL n'est pas définie. Renseignez une URL PostgreSQL " +
      '(Neon en production, ou PostgreSQL isolé pour les tests).',
  );
}

if (!databaseUrl.startsWith('postgres')) {
  throw new Error(
    `DATABASE_URL doit pointer vers PostgreSQL (reçu : "${databaseUrl.slice(0, 12)}…"). ` +
      "SQLite n'est plus supporté : voir l'anomalie MS-011 du rapport d'audit.",
  );
}

// Neon pooled connections use transaction mode. Keep serverless pools small.
const globalForDb = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
};

// One connection suits a serverless function instance. A long-running server
// (`next start`, CI) needs several, otherwise every page, action and prefetch
// queues on the same connection. Identity stays transaction-local (SET LOCAL).
const configuredPoolMax = Number.parseInt(process.env.DATABASE_POOL_MAX ?? '', 10);
const poolMax = Number.isInteger(configuredPoolMax) && configuredPoolMax > 0 ? configuredPoolMax : 1;

const client = globalForDb.postgresClient ?? postgres(databaseUrl, {
  prepare: false,
  max: poolMax,
  idle_timeout: 20,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.postgresClient = client;
}

// React cache covers rendering; server actions also need request memoization.
// Next's cookie-store object belongs to one request. A WeakMap never shares an
// identity between requests or persists it in a pooled database connection.
const verifiedRequests = new WeakMap<object, Promise<string | null>>();
const verifyProvider = async () => {
  for (let attempt = 0; attempt < 3; attempt++) {
    // The SDK verifies its HMAC-signed cache or verifies upstream on a miss.
    // Check the exact managed session in PostgreSQL even on a cache hit.
    const { data, error } = await auth.getSession();
    if (!error) {
      if (!data?.user?.id || !data.session?.id) return null;
      const [verified] = await client`select public.provider_session_is_active(${data.user.id},${data.session.id}) as active`;
      return verified.active ? data.user.id : null;
    }
    if (error.status === 401 || error.status === 403) return null;
    if (attempt === 2) {
      console.warn('[auth] authoritative verification unavailable', { status: error.status, code: error.code });
      throw new Error('Authentication service temporarily unavailable');
    }
    await new Promise(resolve => setTimeout(resolve, 250 * (attempt + 1)));
  }
  return null;
};
const getProviderUserId = cache(async () => {
  const request = await cookies();
  let verified = verifiedRequests.get(request);
  if (!verified) { verified = verifyProvider(); verifiedRequests.set(request, verified); }
  return verified;
});

const workers = new Map<string, postgres.Sql>();
const getConnection = (): { client: postgres.Sql; role: string; settings: Record<string, string> } => {
  const worker = getWorkerAuthority();
  if (!worker) return { client, role: 'monservice_runtime', settings: {} };
  const role = `monservice_${worker.kind}`;
  const url = worker.kind === 'stripe' ? process.env.NEON_STRIPE_DATABASE_URL : process.env.NEON_REMINDERS_DATABASE_URL;
  if (!url) throw new Error('Restricted worker database configuration missing');
  let connection = workers.get(role);
  if (!connection) { connection = postgres(url, { prepare: false, max: 1, idle_timeout: 20 }); workers.set(role, connection); }
  return { client: connection, role, settings: {
    'monservice.worker_event_id': worker.eventId ?? '',
    'monservice.worker_subject_id': worker.subjectId ?? '',
  } };
};
export const db = drizzle(createSecurityScopedClient(client, getProviderUserId, getConnection), { schema });

export * from './schema';
