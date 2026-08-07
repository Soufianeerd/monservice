const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL, { prepare: false });

async function run() {
  const tables = [
    'users', 'organizations', 'clients', 'contacts', 'deals',
    'products', 'invoices', 'invoice_lines', 'tasks', 'requests',
    'messages', 'message_templates', 'stripe_events'
  ];
  try {
    for (const t of tables) {
      await sql.unsafe(`DROP TABLE IF EXISTS public.${t} CASCADE`);
      console.log(`Dropped ${t}`);
    }
    await sql.unsafe(`DROP SCHEMA IF EXISTS drizzle CASCADE`);
    console.log("Dropped drizzle schema");
  } catch(e) {
    console.error("Error:", e);
  } finally {
    await sql.end();
  }
}
run();
