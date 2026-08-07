const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
console.log("URL:", process.env.DATABASE_URL);
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
sql`SELECT 1 as result`.then(console.log).catch(console.error).finally(() => sql.end());
