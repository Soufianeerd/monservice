import postgres from 'postgres';

interface ExpectedFunctionContract {
  security_definer: boolean;
  public_exec: boolean;
  anon_exec: boolean;
  auth_exec: boolean;
}

interface ExactPolicyContract {
  policyName: string;
  tableName: string;
  expectedRoles: string[];
  expectedCmd: string;
  qualSemantics: string[];
  withCheckSemantics: string[];
}

async function verifyCustomObjects() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  console.log('Verifying custom Supabase objects, RLS and strict GRANTS...');
  const sql = postgres(dbUrl);
  let errorCount = 0;

  // 1. Strict GRANT allowlist for tables
  const expectedPrivileges: Record<string, { anon: string[], authenticated: string[] }> = {
    users: { anon: [], authenticated: ['SELECT', 'UPDATE'] },
    organizations: { anon: [], authenticated: ['SELECT', 'UPDATE'] },
    clients: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    contacts: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    deals: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    products: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    invoices: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    invoice_lines: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    tasks: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    message_templates: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    messages: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    requests: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    stripe_events: { anon: [], authenticated: [] },
    processing_activities: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
    audit_logs: { anon: [], authenticated: ['SELECT', 'INSERT'] },
    data_subject_requests: { anon: [], authenticated: ['SELECT', 'INSERT'] },
    consent_events: { anon: [], authenticated: ['SELECT', 'INSERT'] },
    country_compliance_profiles: { anon: [], authenticated: ['SELECT'] },
    retention_policies: { anon: [], authenticated: ['SELECT'] },
    practice_locations: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    practice_practitioners: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    practitioner_locations: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    practice_rooms: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    practice_resources: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    patient_profiles: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    patient_representatives: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    patient_representative_links: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] }
  };

  const dbGrants = await sql`
    SELECT table_name, grantee, privilege_type
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public' 
    AND grantee IN ('anon', 'authenticated')
  `;

  for (const [table, roles] of Object.entries(expectedPrivileges)) {
    for (const role of ['anon', 'authenticated'] as const) {
      const expected = roles[role];
      const actualRows = dbGrants.filter(g => g.table_name === table && g.grantee === role);
      const actual = actualRows.map(g => g.privilege_type);
      
      const missing = expected.filter(p => !actual.includes(p));
      const extra = actual.filter(p => !expected.includes(p));

      if (missing.length > 0) {
        console.error(`❌ ERROR: Table '${table}' missing ${role} privileges: ${missing.join(', ')}`);
        errorCount++;
      }
      if (extra.length > 0) {
        console.error(`❌ ERROR: Table '${table}' has EXTRA ${role} privileges: ${extra.join(', ')}`);
        errorCount++;
      }
    }
  }

  // 2. Verify functions strictly
  const funcs = await sql`
    SELECT p.proname, p.prosecdef as security_definer,
           (SELECT has_function_privilege('public', p.oid, 'execute')) as public_exec,
           (SELECT has_function_privilege('anon', p.oid, 'execute')) as anon_exec,
           (SELECT has_function_privilege('authenticated', p.oid, 'execute')) as auth_exec
    FROM pg_proc p
    WHERE p.proname IN ('handle_new_auth_user', 'current_organization_id');
  `;

  const expectedFuncs: Record<string, ExpectedFunctionContract> = {
    handle_new_auth_user: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    current_organization_id: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: true }
  };

  for (const [fname, expected] of Object.entries(expectedFuncs)) {
    const f = funcs.find(x => x.proname === fname);
    if (!f) {
      console.error(`❌ ERROR: Function ${fname} not found.`);
      errorCount++;
      continue;
    }
    if (f.security_definer !== expected.security_definer) {
      console.error(`❌ ERROR: Function ${fname} security_definer is ${f.security_definer}, expected ${expected.security_definer}`);
      errorCount++;
    }
    if (f.public_exec !== expected.public_exec) {
      console.error(`❌ ERROR: Function ${fname} public_exec is ${f.public_exec}, expected ${expected.public_exec}`);
      errorCount++;
    }
    if (f.anon_exec !== expected.anon_exec) {
      console.error(`❌ ERROR: Function ${fname} anon_exec is ${f.anon_exec}, expected ${expected.anon_exec}`);
      errorCount++;
    }
    if (f.auth_exec !== expected.auth_exec) {
      console.error(`❌ ERROR: Function ${fname} auth_exec is ${f.auth_exec}, expected ${expected.auth_exec}`);
      errorCount++;
    }
  }

  // 3. Verify trigger
  const rlsTables = await sql`
    SELECT relname FROM pg_class 
    WHERE relrowsecurity = true AND relnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  `;
  const rlsTableNames = new Set(rlsTables.map(t => t.relname));
  
  const policies = await sql`
    SELECT policyname, tablename, roles, cmd, qual, with_check 
    FROM pg_policies WHERE schemaname = 'public'
  `;

  const triggers = await sql`
    SELECT tgname FROM pg_trigger 
    WHERE tgname = 'on_auth_user_created'
  `;
  if (triggers.length === 0) {
    console.error('❌ ERROR: Trigger on_auth_user_created not found.');
    errorCount++;
  }

  // 4. Verify RLS enabled and policies present for core tenant tables
  const expectedRlsTables = [
    'users', 'organizations', 'clients', 'contacts', 'deals', 'products', 
    'invoices', 'invoice_lines', 'tasks', 'message_templates', 'messages', 'requests',
    'practice_locations', 'practice_practitioners', 'practitioner_locations', 'practice_rooms', 'practice_resources',
    'patient_profiles', 'patient_representatives', 'patient_representative_links'
  ];

  for (const table of expectedRlsTables) {
    if (!rlsTableNames.has(table)) {
      console.error(`❌ ERROR: RLS is NOT enabled on table '${table}'.`);
      errorCount++;
    }
    
    const tablePolicies = policies.filter(p => p.tablename === table);
    if (tablePolicies.length === 0) {
      console.error(`❌ ERROR: No RLS policies found for table '${table}'.`);
      errorCount++;
    }
  }

  // Stripe events must have RLS enabled, but no policies (deny all)
  if (!rlsTableNames.has('stripe_events')) {
    console.error(`❌ ERROR: RLS is NOT enabled on table 'stripe_events'.`);
    errorCount++;
  }

  // 5. Exact Policy Contracts for Practice Structure & Patient Registry
  const commonProfessionalSemantics = [
    'current_organization_id',
    'auth.uid',
    'profile_type',
    'professional'
  ];

  const exactPolicies: ExactPolicyContract[] = [
    {
      policyName: 'practice_locations_tenant_isolation',
      tableName: 'practice_locations',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: commonProfessionalSemantics,
    },
    {
      policyName: 'practice_practitioners_tenant_isolation',
      tableName: 'practice_practitioners',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: [...commonProfessionalSemantics, 'user_id', 'professional'],
    },
    {
      policyName: 'practitioner_locations_tenant_isolation',
      tableName: 'practitioner_locations',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: commonProfessionalSemantics,
    },
    {
      policyName: 'practice_rooms_tenant_isolation',
      tableName: 'practice_rooms',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: commonProfessionalSemantics,
    },
    {
      policyName: 'practice_resources_tenant_isolation',
      tableName: 'practice_resources',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: commonProfessionalSemantics,
    },
    {
      policyName: 'patient_profiles_tenant_isolation',
      tableName: 'patient_profiles',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: commonProfessionalSemantics,
    },
    {
      policyName: 'patient_representatives_tenant_isolation',
      tableName: 'patient_representatives',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: commonProfessionalSemantics,
    },
    {
      policyName: 'patient_representative_links_tenant_isolation',
      tableName: 'patient_representative_links',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: commonProfessionalSemantics,
    },
  ];

  for (const ep of exactPolicies) {
    const p = policies.find(x => x.policyname === ep.policyName && x.tablename === ep.tableName);
    if (!p) {
      console.error(`❌ ERROR: Policy '${ep.policyName}' on table '${ep.tableName}' not found.`);
      errorCount++;
      continue;
    }

    // Check roles strictly (no missing, no extra)
    for (const expectedRole of ep.expectedRoles) {
      if (!p.roles.includes(expectedRole)) {
        console.error(`❌ ERROR: Policy '${ep.policyName}' missing expected role '${expectedRole}' (actual: ${p.roles.join(', ')}).`);
        errorCount++;
      }
    }
    const extraRoles = p.roles.filter((r: string) => !ep.expectedRoles.includes(r));
    if (extraRoles.length > 0) {
      console.error(`❌ ERROR: Policy '${ep.policyName}' has unexpected extra roles: ${extraRoles.join(', ')}`);
      errorCount++;
    }

    // Check command
    if (p.cmd !== ep.expectedCmd) {
      console.error(`❌ ERROR: Policy '${ep.policyName}' cmd is '${p.cmd}', expected '${ep.expectedCmd}'.`);
      errorCount++;
    }

    // Check qual present & semantics
    if (!p.qual) {
      console.error(`❌ ERROR: Policy '${ep.policyName}' missing USING (qual) expression.`);
      errorCount++;
    } else {
      const normalizedQual = p.qual.toLowerCase().replace(/\s+/g, '');
      for (const sem of ep.qualSemantics) {
        if (!normalizedQual.includes(sem.replace(/\s+/g, ''))) {
          console.error(`❌ ERROR: Policy '${ep.policyName}' USING clause missing semantic element '${sem}'.`);
          errorCount++;
        }
      }
    }

    // Check with_check present & semantics
    if (!p.with_check) {
      console.error(`❌ ERROR: Policy '${ep.policyName}' missing WITH CHECK expression.`);
      errorCount++;
    } else {
      const normalizedWithCheck = p.with_check.toLowerCase().replace(/\s+/g, '');
      for (const sem of ep.withCheckSemantics) {
        if (!normalizedWithCheck.includes(sem.replace(/\s+/g, ''))) {
          console.error(`❌ ERROR: Policy '${ep.policyName}' WITH CHECK clause missing semantic element '${sem}'.`);
          errorCount++;
        }
      }
    }
  }

  await sql.end();

  if (errorCount > 0) {
    console.error(`\n❌ Custom objects check failed with ${errorCount} errors.`);
    process.exit(1);
  } else {
    console.log('✅ Custom Supabase objects, strict GRANTS, RLS, and exact policy semantics verified successfully!');
  }
}

verifyCustomObjects().catch(e => {
  console.error(e);
  process.exit(1);
});
