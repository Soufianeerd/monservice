const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL, { prepare: false });
async function run() {
  try {
    const authUsers = await sql`SELECT id, email, raw_user_meta_data FROM auth.users`;
    for (const u of authUsers) {
      console.log(`Syncing ${u.email}...`);
      await sql`
        INSERT INTO public.users (
          id, email, name, profile_type, onboarding_completed, onboarding_step,
          subscription_tier, subscription_status, created_at, updated_at
        ) VALUES (
          ${u.id}, ${u.email}, ${u.raw_user_meta_data?.name || u.email.split('@')[0]},
          ${u.raw_user_meta_data?.profileType || 'client'}, false, 0,
          'free', 'inactive', now()::text, now()::text
        ) ON CONFLICT (id) DO NOTHING;
      `;
    }
    console.log("Sync complete!");
  } catch(e) {
    console.error("Sync error:", e.message);
  } finally {
    await sql.end();
  }
}
run();
