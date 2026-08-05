
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePg } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from '../src/lib/db/schema';
import * as dotenv from 'dotenv';

import fs from 'fs';
const envLocal = dotenv.parse(fs.readFileSync('.env.local'));
const envProd = dotenv.parse(fs.readFileSync('.env.production'));
const sqliteUrl = envLocal.DATABASE_URL || './database.sqlite';
const pgUrl = envProd.DATABASE_URL;

async function migrate() {
  console.log('Starting data migration...');

  // 1. Connect to local SQLite
  console.log('Connecting to SQLite...');
  const sqlite = new Database('./database.sqlite');
  const sqliteDb = drizzleSqlite(sqlite, { schema });

  // 2. Connect to production PostgreSQL
  if (!pgUrl?.startsWith('postgres')) {
    console.error('DATABASE_URL must be a postgres URL for migration destination.');
    process.exit(1);
  }

  console.log('Connecting to PostgreSQL...', pgUrl);
  const client = postgres(pgUrl, { prepare: false });
  const pgDb = drizzlePg(client, { schema });

  // 3. Migrate tables
  const tablesToMigrate = [
    'users',
    'organizations',
    'clients',
    'contacts',
    'deals',
    'products',
    'invoices',
    'invoiceLines',
    'tasks',
    'requests',
    'messages',
    'messageTemplates'
  ] as const;

  for (const tableName of tablesToMigrate) {
    console.log(`Migrating table: ${tableName}...`);
    const table = schema[tableName];
    
    // Fetch from SQLite
    const rows = await sqliteDb.select().from(table as never);
    console.log(`Found ${rows.length} rows in ${tableName}`);
    
    // Insert into PG
    if (rows.length > 0) {
      try {
        await pgDb.insert(table as never).values(rows as never);
        console.log(`Successfully migrated ${rows.length} rows to ${tableName}`);
      } catch (err) {
        console.error(`Error migrating table ${tableName}:`, err);
      }
    }
  }

  console.log('Data migration complete.');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
