// Read-only inventory. Credentials and account records never go to stdout or Git.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import dotenv from 'dotenv';
import postgres from 'postgres';

const directory = process.env.MIGRATION_BACKUP_DIR ?? path.join(os.homedir(), '.local/share/monservice-migration/2026-10-09');
const environment = dotenv.parse(fs.readFileSync(path.join(directory, 'source.env')));
const url = new URL(environment.DATABASE_URL);
if (!decodeURIComponent(url.username).includes('leydfjctaxohovcmcgea')) throw new Error('Unexpected source project');
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const sql = postgres(environment.DATABASE_URL, { max: 1, prepare: false, connect_timeout: 10 });
const save = (name, value) => fs.writeFileSync(path.join(directory, name), JSON.stringify(value, null, 2), { mode: 0o600 });
try {
  await sql.begin('isolation level repeatable read read only', async tx => {
    const inventory = {};
    inventory.database = await tx`select version(), pg_database_size(current_database())::text as bytes`;
    inventory.schemas = await tx`select schema_name from information_schema.schemata order by schema_name`;
    const tables = await tx`select schemaname, tablename from pg_tables where schemaname in ('public','auth','storage','drizzle') order by schemaname,tablename`;
    inventory.tables = [];
    for (const table of tables) {
      const quote = x => '"' + x.replaceAll('"', '""') + '"';
      const [count] = await tx.unsafe(`select count(*)::int as rows from ${quote(table.schemaname)}.${quote(table.tablename)}`);
      inventory.tables.push({ ...table, ...count });
    }
    inventory.columns = await tx`select table_name,column_name,data_type,udt_name,is_nullable,column_default from information_schema.columns where table_schema='public' order by table_name,ordinal_position`;
    inventory.constraints = await tx`select c.conname, c.contype, c.conrelid::regclass::text as relation, pg_get_constraintdef(c.oid) as definition from pg_constraint c join pg_namespace n on n.oid=c.connamespace where n.nspname='public' order by c.conname`;
    inventory.indexes = await tx`select tablename,indexname,indexdef from pg_indexes where schemaname='public' order by tablename,indexname`;
    inventory.functions = await tx`select p.proname,pg_get_function_identity_arguments(p.oid) as arguments,pg_get_functiondef(p.oid) as definition,p.prosecdef from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prokind='f' order by p.proname`;
    inventory.triggers = await tx`select c.relname, t.tgname,pg_get_triggerdef(t.oid) as definition from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and not t.tgisinternal order by c.relname,t.tgname`;
    inventory.policies = await tx`select * from pg_policies where schemaname in ('public','storage') order by schemaname,tablename,policyname`;
    inventory.roles = await tx`select rolname,rolsuper,rolbypassrls,rolcanlogin from pg_roles order by rolname`;
    inventory.extensions = await tx`select extname,extversion from pg_extension order by extname`;
    inventory.migrations = await tx`select * from drizzle.__drizzle_migrations order by id`;
    inventory.authProviders = await tx`select provider,count(*)::int as count from auth.identities group by provider`;
    inventory.buckets = await tx`select id,public,file_size_limit,allowed_mime_types from storage.buckets order by id`;
    inventory.objects = await tx`select bucket_id,count(*)::int as count,sum(coalesce((metadata->>'size')::bigint,0))::text as bytes from storage.objects group by bucket_id`;
    // Minimum account information for verified re-enrollment; no password hashes or sessions.
    save('source-identities.json', await tx`select id,email,email_confirmed_at,created_at,updated_at,is_anonymous from auth.users order by id`);
    save('source-app-users.json', await tx`select * from public.users order by id`);
    save('source-inventory.json', inventory);
    const snapshot = JSON.parse(fs.readFileSync('drizzle/postgres/meta/0023_snapshot.json'));
    const canonical = new Set(Object.values(snapshot.tables).map(t => t.name));
    const deployed = new Set(inventory.tables.filter(t => t.schemaname === 'public').map(t => t.tablename));
    const drift = [];
    for (const [key, table] of Object.entries(snapshot.tables)) {
      const live = inventory.columns.filter(c => c.table_name === table.name);
      const missing = Object.keys(table.columns).filter(c => !live.some(l => l.column_name === c));
      const extra = live.filter(c => !table.columns[c.column_name]).map(c => c.column_name);
      drift.push({ table: key, classification: !deployed.has(table.name) ? 'REPO_ONLY' : missing.length || extra.length ? 'SOURCE_DEPLOYED_BUT_DRIFTED' : 'SOURCE_DEPLOYED_AND_CANONICAL', missingColumns: missing, extraColumns: extra });
    }
    for (const name of deployed) if (!canonical.has(name)) drift.push({ table: name, classification: 'SOURCE_ONLY' });
    save('source-schema-classification.json', drift);
    console.log(JSON.stringify({ source: 'leydfjctaxohovcmcgea', businessTables: deployed.size, businessRows: inventory.tables.filter(t => t.schemaname === 'public').reduce((n,t) => n+t.rows,0), authUsers: inventory.tables.find(t => t.schemaname === 'auth' && t.tablename === 'users').rows, objects: inventory.objects, drift: drift.filter(t => t.classification !== 'SOURCE_DEPLOYED_AND_CANONICAL') }, null, 2));
  });
} finally { await sql.end(); }
