import postgres from 'postgres';

async function research() {
  const prodUrl = 'postgresql://postgres.leydfjctaxohovcmcgea:Monservice2026!@aws-0-eu-north-1.pooler.supabase.com:5432/postgres';
  const sql = postgres(prodUrl);
  
  try {
    // Check Drizzle migration journal
    // The journal might be in drizzle schema or public depending on config
    let migrations = [];
    try {
      migrations = await sql`SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 5`;
    } catch {
      try {
        migrations = await sql`SELECT * FROM public.__drizzle_migrations ORDER BY created_at DESC LIMIT 5`;
      } catch {
        migrations = await sql`SELECT * FROM __drizzle_migrations ORDER BY created_at DESC LIMIT 5`;
      }
    }
    console.log('--- REMOTE DRIZZLE MIGRATIONS ---');
    console.log(migrations);

    // Check grants
    const grants = await sql`
      SELECT grantee, table_schema, table_name, privilege_type
      FROM information_schema.role_table_grants
      WHERE table_schema = 'public' 
      AND grantee IN ('anon', 'authenticated')
      ORDER BY table_name, grantee, privilege_type;
    `.catch(() => []);
    console.log('\n--- REMOTE CURRENT GRANTS ---');
    console.log(grants);
    
    // Check policies
    const policies = await sql`
      SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
      FROM pg_policies
      WHERE schemaname = 'public';
    `.catch(() => []);
    console.log('\n--- REMOTE POLICIES ---');
    console.log(policies);

    // Check Functions
    const funcs = await sql`
      SELECT p.proname, u.usename as owner, p.prosecdef as security_definer,
             pg_get_function_identity_arguments(p.oid) as args,
             (SELECT has_function_privilege('public', p.oid, 'execute')) as public_exec
      FROM pg_proc p
      JOIN pg_user u ON p.proowner = u.usesysid
      WHERE p.proname IN ('handle_new_auth_user', 'current_organization_id');
    `.catch(() => []);
    console.log('\n--- REMOTE FUNCTIONS ---');
    console.log(funcs);
    
  } finally {
    await sql.end();
  }
}

research().catch(console.error);
