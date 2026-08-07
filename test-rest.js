require('dotenv').config({ path: '.env.local' });
const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/';
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
fetch(url, { headers: { 'apikey': key, 'Authorization': 'Bearer ' + key } })
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
