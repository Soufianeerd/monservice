import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

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

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL n'est pas définie. Renseignez une URL PostgreSQL " +
      '(Supabase en production, ou un conteneur local en développement).',
  );
}

if (!databaseUrl.startsWith('postgres')) {
  throw new Error(
    `DATABASE_URL doit pointer vers PostgreSQL (reçu : "${databaseUrl.slice(0, 12)}…"). ` +
      "SQLite n'est plus supporté : voir l'anomalie MS-011 du rapport d'audit.",
  );
}

// `prepare: false` est requis par le pooler de connexions Supabase (pgBouncer
// en mode transaction). `max: 1` limite la pression sur le pool depuis des
// fonctions serverless susceptibles de démarrer en grand nombre.
const globalForDb = globalThis as unknown as {
  postgresClient: postgres.Sql | undefined;
};

const client = globalForDb.postgresClient ?? postgres(databaseUrl, {
  prepare: false,
  max: Number(process.env.DATABASE_POOL_MAX ?? 1),
  idle_timeout: 20,
  connect_timeout: 10,
});

if (process.env.NODE_ENV !== 'production') {
  globalForDb.postgresClient = client;
}

export const db = drizzle(client, { schema });

export * from './schema';
