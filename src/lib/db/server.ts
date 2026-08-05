import 'server-only';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from './schema';

let db: ReturnType<typeof drizzleSqlite<typeof schema>>;

if (process.env.DATABASE_URL?.startsWith('postgres')) {
  // PostgreSQL (Supabase)
  const client = postgres(process.env.DATABASE_URL, { prepare: false });
  db = drizzlePg(client, { schema }) as any;
} else {
  // SQLite (local)
  const sqlite = new Database(process.env.DATABASE_URL || './database.sqlite');
  db = drizzleSqlite(sqlite, { schema });
}

export { db };
export * from './schema';
