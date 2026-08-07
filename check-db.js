const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
sql`SELECT count(*) FROM users`.then(r => console.log('Users:', r)).catch(e => console.log('Error users:', e.message));
sql`SELECT count(*) FROM clients`.then(r => console.log('Clients:', r)).catch(e => console.log('Error clients:', e.message))
.finally(() => sql.end());
