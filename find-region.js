const postgres = require('postgres');
const regions = ['eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1'];

async function testRegion(region) {
  const url = `postgresql://postgres.leydfjctaxohovcmcgea:GrJbLMxrJjvQa5X7@aws-0-${region}.pooler.supabase.com:6543/postgres`;
  const sql = postgres(url, { prepare: false, connect_timeout: 3 });
  try {
    await sql`SELECT 1`;
    console.log(`[SUCCESS] Region found and connected: ${region}`);
    process.exit(0);
  } catch (err) {
    if (err.message.includes('password authentication failed')) {
       console.log(`[FOUND TENANT] Region is ${region}, but password is wrong!`);
    } else if (err.message.includes('not found')) {
       console.log(`[NOT FOUND] Region is not ${region}`);
    } else {
       console.log(`[ERROR] Region ${region}: ${err.message}`);
    }
  } finally {
    sql.end();
  }
}

async function run() {
  for (const r of regions) {
    await testRegion(r);
  }
}
run();
