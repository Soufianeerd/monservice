import fs from 'node:fs';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import postgres from 'postgres';
const admin=dotenv.parse(fs.readFileSync(process.env.NEON_ADMIN_ENV_FILE ?? '.env.neon-admin.local'));
const sql=postgres(admin.DATABASE_URL_UNPOOLED,{max:1});
try {
  const applied=await sql`select name,checksum from monservice_migrations.applied order by name`;
  const files=fs.readdirSync('drizzle/neon').filter(name=>name.endsWith('.sql')).sort();
  if (files.length!==applied.length) throw new Error('Unapplied or unknown Neon migration');
  for(const name of files)if(applied.find(row=>row.name===name)?.checksum!==crypto.createHash('sha256').update(fs.readFileSync('drizzle/neon/'+name)).digest('hex'))throw new Error('Migration checksum mismatch: '+name);
  console.log(`Verified ${files.length} immutable Neon migration checksums`);
} finally {await sql.end();}
