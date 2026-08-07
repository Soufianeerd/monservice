const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
// Remove the project ref from the username
let url = process.env.DATABASE_URL.replace('postgres.leydfjctaxohovcmcgea', 'postgres');
console.log("URL:", url);
const sql = postgres(url, { prepare: false });
sql`SELECT 1 as result`.then(console.log).catch(console.error).finally(() => sql.end());
