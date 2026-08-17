import postgres from 'postgres';

async function verifyCustomObjects() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  console.log('Verifying custom Supabase objects...');
  const sql = postgres(dbUrl);
  let errorCount = 0;

  // 1. Verify functions
  const functions = await sql`
    SELECT proname FROM pg_proc 
    WHERE proname IN ('handle_new_auth_user', 'current_organization_id')
  `;
  const funcNames = new Set(functions.map(f => f.proname));
  
  if (!funcNames.has('handle_new_auth_user')) {
    console.error('❌ ERROR: Function handle_new_auth_user not found.');
    errorCount++;
  }
  if (!funcNames.has('current_organization_id')) {
    console.error('❌ ERROR: Function current_organization_id not found.');
    errorCount++;
  }

  // 2. Verify trigger
  const triggers = await sql`
    SELECT tgname FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  `;
  if (triggers.length === 0) {
    console.error('❌ ERROR: Trigger on_auth_user_created not found.');
    errorCount++;
  }

  // 3. Verify RLS enabled on core tables
  const rlsTables = await sql`
    SELECT relname FROM pg_class 
    WHERE relrowsecurity = true AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  `;
  const rlsTableNames = new Set(rlsTables.map(t => t.relname));
  const expectedRlsTables = ['users', 'organizations', 'clients', 'invoices', 'deals', 'products', 'contacts'];

  for (const table of expectedRlsTables) {
    if (!rlsTableNames.has(table)) {
      console.error(`❌ ERROR: Row Level Security is NOT enabled on table '${table}'.`);
      errorCount++;
    }
  }

  // 4. Verify some key policies exist
  const policies = await sql`
    SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public'
  `;
  const policyMap = new Set(policies.map(p => `${p.tablename}:${p.policyname}`));
  
  // We don't check every single policy strictly, but we check if tables have at least some policies
  for (const table of expectedRlsTables) {
    const tablePolicies = policies.filter(p => p.tablename === table);
    if (tablePolicies.length === 0) {
      console.error(`❌ ERROR: No RLS policies found for table '${table}'.`);
      errorCount++;
    }
  }

  await sql.end();

  if (errorCount > 0) {
    console.error(`\n❌ Custom objects check failed with ${errorCount} errors.`);
    process.exit(1);
  } else {
    console.log('✅ Custom Supabase objects and RLS verified successfully!');
  }
}

verifyCustomObjects().catch(e => {
  console.error(e);
  process.exit(1);
});
