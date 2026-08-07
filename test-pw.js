const postgres = require('postgres');
async function tryConnect(pwd) {
  const url = `postgresql://postgres.leydfjctaxohovcmcgea:${pwd}@aws-0-eu-north-1.pooler.supabase.com:6543/postgres`;
  const sql = postgres(url, { prepare: false, connect_timeout: 3 });
  try {
    await sql`SELECT 1`;
    console.log(`[SUCCESS] Connected with password: ${pwd}`);
    process.exit(0);
  } catch(e) {
    console.log(`[FAIL] ${pwd} failed: ${e.message}`);
  } finally {
    sql.end();
  }
}
async function run() {
  await tryConnect('Monservice2026');
  await tryConnect('Monservice2026!');
  await tryConnect('Monservice2026!Qa5X7');
}
run();
