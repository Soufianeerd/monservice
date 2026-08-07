const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
// Use port 5432
let url = process.env.DATABASE_URL.replace(':6543', ':5432');
console.log("URL:", url);
const sql = postgres(url, { prepare: false });
sql`SELECT 1 as result`.then(console.log).catch(console.error).finally(() => sql.end());
