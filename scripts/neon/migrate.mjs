import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import postgres from 'postgres';

const environment = dotenv.parse(fs.readFileSync(process.env.NEON_ADMIN_ENV_FILE ?? '.env.neon-admin.local'));
if (!environment.DATABASE_URL_UNPOOLED || !environment.NEON_BRANCH) throw new Error('Explicit Neon admin environment required');
if (environment.NEON_BRANCH === 'production' && process.env.NEON_PRODUCTION_REPLAY !== 'validated') throw new Error('Production replay requires completed validation');
const sql = postgres(environment.DATABASE_URL_UNPOOLED, { max: 1, prepare: false, onnotice: () => {} });
try {
  await sql`create schema if not exists monservice_migrations`;
  await sql`create table if not exists monservice_migrations.applied (name text primary key, checksum text not null, applied_at timestamptz not null default now())`;
  for (const name of fs.readdirSync('drizzle/neon').filter(n => n.endsWith('.sql')).sort()) {
    const migration = fs.readFileSync('drizzle/neon/' + name, 'utf8');
    const checksum = crypto.createHash('sha256').update(migration).digest('hex');
    const [previous] = await sql`select checksum from monservice_migrations.applied where name=${name}`;
    if (previous) {
      if (previous.checksum !== checksum) throw new Error('Applied migration changed: ' + name);
      continue;
    }
    await sql.begin(async tx => {
      await tx.unsafe(migration);
      await tx`insert into monservice_migrations.applied(name,checksum) values(${name},${checksum})`;
    });
    console.log('Applied ' + name);
  }
} catch (error) {
  // SQL errors can embed query parameters; print diagnostic identifiers only.
  console.error(JSON.stringify({ type: error.name, code: error.code, message: error.code ? 'Migration SQL failed; inspect the versioned statement.' : error.message }));
  process.exitCode = 1;
} finally { await sql.end(); }
