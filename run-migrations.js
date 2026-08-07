const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const { migrate } = require('drizzle-orm/postgres-js/migrator');
require('dotenv').config({ path: '.env.local' });

async function run() {
  console.log("Connecting...");
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const db = drizzle(sql);
  console.log("Running migrations...");
  try {
    await migrate(db, { migrationsFolder: 'drizzle/postgres' });
    console.log("Migrations successful!");
  } catch(e) {
    console.error("Migration failed:", e);
  } finally {
    await sql.end();
  }
}
run();
