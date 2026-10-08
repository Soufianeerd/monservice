// Write a dedicated NOINHERIT/NOBYPASSRLS login into the ignored runtime env.
// The migration owner URL stays exclusively in the separate private admin env.
import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import postgres from 'postgres';

const environment = dotenv.parse(fs.readFileSync('.env.neon-admin.local'));
const sql = postgres(environment.DATABASE_URL_UNPOOLED, { max: 1 });
try {
  const password = crypto.randomBytes(36).toString('hex');
  await sql.unsafe(`ALTER ROLE monservice_runtime PASSWORD '${password}'`);
  const runtimeUrl = new URL(environment.DATABASE_URL);
  runtimeUrl.username = 'monservice_runtime';
  runtimeUrl.password = password;
  const local = dotenv.parse(fs.readFileSync('.env.local'));
  delete local.DATABASE_URL_UNPOOLED;
  local.DATABASE_URL = runtimeUrl.toString();
  fs.writeFileSync('.env.local', Object.entries(local).map(([key,value]) => `${key}=${JSON.stringify(value)}`).join('\n') + '\n', { mode: 0o600 });
  const runtime = postgres(runtimeUrl.toString(), { max: 1 });
  try {
    const [role] = await runtime`select current_user as role,rolsuper,rolbypassrls,rolinherit from pg_roles where rolname=current_user`;
    if (role.rolsuper || role.rolbypassrls || role.rolinherit || role.role !== 'monservice_runtime') throw new Error('Unsafe runtime role');
    const [owned] = await runtime`select count(*)::int as count from pg_tables where schemaname='public' and tableowner=current_user`;
    if (owned.count) throw new Error('Runtime owns business tables');
    console.log({ runtimeRole: role.role, bypassRls: false, ownedTables: owned.count });
  } finally { await runtime.end(); }
} finally { await sql.end(); }
