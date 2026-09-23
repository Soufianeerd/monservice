import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
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
    patient_representative_links: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    appointment_types: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    practitioner_availability_rules: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    practitioner_availability_exceptions: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    appointments: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    appointment_waitlist_entries: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    care_episodes: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    clinical_encounters: { anon: [], authenticated: ['SELECT', 'INSERT'] },
    clinical_notes: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    clinical_documents: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    clinical_form_templates: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    clinical_form_responses: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    clinical_measurements: { anon: [], authenticated: ['SELECT', 'INSERT'] },
    patient_portal_access: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    patient_questionnaire_assignments: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    patient_billing_links: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    appointment_reminder_deliveries: { anon: [], authenticated: [] },
    field_service_sites: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    field_service_work_orders: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    field_service_work_order_assignments: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    field_service_work_reports: { anon: [], authenticated: ['SELECT', 'INSERT', 'UPDATE'] },
    field_service_work_order_status_history: { anon: [], authenticated: ['SELECT'] }
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
           pg_get_functiondef(p.oid) as funcdef,
           (SELECT has_function_privilege('public', p.oid, 'execute')) as public_exec,
           (SELECT has_function_privilege('anon', p.oid, 'execute')) as anon_exec,
           (SELECT has_function_privilege('authenticated', p.oid, 'execute')) as auth_exec
    FROM pg_proc p
    WHERE p.proname IN (
      'handle_new_auth_user',
      'current_organization_id',
      'enforce_appointment_status_transition',
      'enforce_waitlist_status_transition',
      'current_clinical_practitioner_id',
      'enforce_care_episode_transition',
      'enforce_clinical_encounter_insert',
      'enforce_clinical_note_transition',
      'enforce_clinical_document_mutation',
      'enforce_clinical_form_response_transition',
      'enforce_clinical_measurement_insert',
      'can_insert_patient_message',
      'enforce_patient_message_update',
      'has_patient_practitioner_relationship',
      'is_current_field_service_professional',
      'enforce_field_service_site_immutability',
      'enforce_field_service_work_order_transition',
      'record_field_service_work_order_status_history',
      'enforce_field_service_status_history_append_only',
      'enforce_field_service_assignment_invariants',
      'enforce_field_service_work_report_transition'
    );
  `;

  const expectedFuncs: Record<string, ExpectedFunctionContract> = {
    handle_new_auth_user: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    current_organization_id: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: true },
    enforce_appointment_status_transition: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    enforce_waitlist_status_transition: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    current_clinical_practitioner_id: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: true },
    enforce_care_episode_transition: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    enforce_clinical_encounter_insert: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    enforce_clinical_note_transition: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    enforce_clinical_document_mutation: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    enforce_clinical_form_response_transition: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    enforce_clinical_measurement_insert: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    can_insert_patient_message: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: true },
    enforce_patient_message_update: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    has_patient_practitioner_relationship: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: true },
    is_current_field_service_professional: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: true },
    enforce_field_service_site_immutability: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    enforce_field_service_work_order_transition: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    record_field_service_work_order_status_history: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    enforce_field_service_status_history_append_only: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    enforce_field_service_assignment_invariants: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
    enforce_field_service_work_report_transition: { security_definer: true, public_exec: false, anon_exec: false, auth_exec: false },
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

  // Check function definition semantic contracts for has_patient_practitioner_relationship
  const relFunc = funcs.find(x => x.proname === 'has_patient_practitioner_relationship');
  if (relFunc?.funcdef) {
    const normDef = relFunc.funcdef.toLowerCase().replace(/\s+/g, ' ');
    const requiredElements = [
      'care_episodes',
      'patient_id',
      'practitioner_id',
      'organization_id',
      'status',
      'active',
    ];
    for (const el of requiredElements) {
      if (!normDef.includes(el.toLowerCase())) {
        console.error(`❌ ERROR: Function 'has_patient_practitioner_relationship' missing semantic invariant: '${el}'`);
        errorCount++;
      }
    }
  }

  // Check function definition semantic contracts for can_insert_patient_message
  const msgFunc = funcs.find(x => x.proname === 'can_insert_patient_message');
  if (msgFunc?.funcdef) {
    const normDef = msgFunc.funcdef.toLowerCase().replace(/\s+/g, ' ');
    const requiredElements = [
      'patient_portal_access',
      'users',
      'profile_type',
      'client',
      'practice_practitioners',
      'care_episodes',
      'patient_id',
      'practitioner_id',
      'organization_id',
      'current_clinical_practitioner_id',
      'is_active',
      'active',
    ];
    for (const el of requiredElements) {
      if (!normDef.includes(el.toLowerCase())) {
        console.error(`❌ ERROR: Function 'can_insert_patient_message' missing semantic invariant: '${el}'`);
        errorCount++;
      }
    }
  }

  // Check function definition semantic contracts for enforce_patient_message_update
  const msgUpdFunc = funcs.find(x => x.proname === 'enforce_patient_message_update');
  if (msgUpdFunc?.funcdef) {
    const normDef = msgUpdFunc.funcdef.toLowerCase().replace(/\s+/g, ' ');
    const requiredElements = [
      'patient_id',
      '23514',
      'organization_id',
      'sender_id',
      'receiver_id',
      'content',
      'created_at',
      'is_read',
    ];
    for (const el of requiredElements) {
      if (!normDef.includes(el.toLowerCase())) {
        console.error(`❌ ERROR: Function 'enforce_patient_message_update' missing semantic invariant: '${el}'`);
        errorCount++;
      }
    }
  }

  // Check function definition semantic contracts for enforce_appointment_status_transition
  const apptFunc = funcs.find(x => x.proname === 'enforce_appointment_status_transition');
  if (apptFunc?.funcdef) {
    const normDef = apptFunc.funcdef.toLowerCase().replace(/\s+/g, ' ');
    const requiredElements = [
      'no_show',
      'old.starts_at',
      'now()',
      '23514',
      'patient_id',
      'practitioner_id',
      'starts_at',
      'ends_at',
      'timezone',
    ];
    for (const el of requiredElements) {
      if (!normDef.includes(el.toLowerCase())) {
        console.error(`❌ ERROR: Function 'enforce_appointment_status_transition' missing semantic invariant: '${el}'`);
        errorCount++;
      }
    }
  }

  // Check function definition semantic contracts for current_clinical_practitioner_id
  const clinPractFunc = funcs.find(x => x.proname === 'current_clinical_practitioner_id');
  if (clinPractFunc?.funcdef) {
    const normDef = clinPractFunc.funcdef.toLowerCase().replace(/\s+/g, ' ');
    const requiredElements = [
      'auth.uid',
      'current_organization_id',
      'practice_practitioners',
      'users',
      'profile_type',
      'professional',
      'is_active',
      'user_id',
    ];
    for (const el of requiredElements) {
      if (!normDef.includes(el.toLowerCase())) {
        console.error(`❌ ERROR: Function 'current_clinical_practitioner_id' missing semantic invariant: '${el}'`);
        errorCount++;
      }
    }
  }

  // Check function definition semantic contracts for enforce_care_episode_transition
  const careEpFunc = funcs.find(x => x.proname === 'enforce_care_episode_transition');
  if (careEpFunc?.funcdef) {
    const normDef = careEpFunc.funcdef.toLowerCase().replace(/\s+/g, ' ');
    const requiredElements = [
      'active',
      'closed',
      '23514',
      'draft',
      'closed_at',
    ];
    for (const el of requiredElements) {
      if (!normDef.includes(el.toLowerCase())) {
        console.error(`❌ ERROR: Function 'enforce_care_episode_transition' missing semantic invariant: '${el}'`);
        errorCount++;
      }
    }
  }

  // Check function definition semantic contracts for enforce_clinical_encounter_insert
  const encFunc = funcs.find(x => x.proname === 'enforce_clinical_encounter_insert');
  if (encFunc?.funcdef) {
    const normDef = encFunc.funcdef.toLowerCase().replace(/\s+/g, ' ');
    const requiredElements = [
      'occurred_at',
      'now()',
      '23514',
      'care_episodes',
      'appointments',
      'scheduled',
    ];
    for (const el of requiredElements) {
      if (!normDef.includes(el.toLowerCase())) {
        console.error(`❌ ERROR: Function 'enforce_clinical_encounter_insert' missing semantic invariant: '${el}'`);
        errorCount++;
      }
    }
  }

  // Check function definition semantic contracts for enforce_clinical_note_transition
  const noteFunc = funcs.find(x => x.proname === 'enforce_clinical_note_transition');
  if (noteFunc?.funcdef) {
    const normDef = noteFunc.funcdef.toLowerCase().replace(/\s+/g, ' ');
    const requiredElements = [
      'draft',
      'finalized',
      '23514',
      'care_episodes',
      'immutable',
    ];
    for (const el of requiredElements) {
      if (!normDef.includes(el.toLowerCase())) {
        console.error(`❌ ERROR: Function 'enforce_clinical_note_transition' missing semantic invariant: '${el}'`);
        errorCount++;
      }
    }
  }

  // Check function definition semantic contracts for is_current_field_service_professional
  const fsProfFunc = funcs.find(x => x.proname === 'is_current_field_service_professional');
  if (fsProfFunc?.funcdef) {
    const normDef = fsProfFunc.funcdef.toLowerCase().replace(/\s+/g, ' ');
    const requiredElements = [
      'users',
      'profile_type',
      'professional',
      'organizations',
      'sector',
      'field_services',
      'artisan',
    ];
    for (const el of requiredElements) {
      if (!normDef.includes(el.toLowerCase())) {
        console.error(`❌ ERROR: Function 'is_current_field_service_professional' missing semantic invariant: '${el}'`);
        errorCount++;
      }
    }
  }

  // Check function definition semantic contracts for enforce_field_service_work_order_transition
  const woTransFunc = funcs.find(x => x.proname === 'enforce_field_service_work_order_transition');
  if (woTransFunc?.funcdef) {
    const normDef = woTransFunc.funcdef.toLowerCase().replace(/\s+/g, ' ');
    const requiredElements = [
      'draft',
      'scheduled',
      'in_progress',
      'paused',
      'completed',
      'cancelled',
      'actual_start',
      'actual_end',
      'cancellation_reason_code',
      '23514',
    ];
    for (const el of requiredElements) {
      if (!normDef.includes(el.toLowerCase())) {
        console.error(`❌ ERROR: Function 'enforce_field_service_work_order_transition' missing semantic invariant: '${el}'`);
        errorCount++;
      }
    }
  }

  // Check function definition semantic contracts for enforce_field_service_work_report_transition
  const wrTransFunc = funcs.find(x => x.proname === 'enforce_field_service_work_report_transition');
  if (wrTransFunc?.funcdef) {
    const normDef = wrTransFunc.funcdef.toLowerCase().replace(/\s+/g, ' ');
    const requiredElements = [
      'draft',
      'finalized',
      'finalized_at',
      '23514',
    ];
    for (const el of requiredElements) {
      if (!normDef.includes(el.toLowerCase())) {
        console.error(`❌ ERROR: Function 'enforce_field_service_work_report_transition' missing semantic invariant: '${el}'`);
        errorCount++;
      }
    }
  }

  // 3. Verify triggers
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
    SELECT tgname, relname, pg_get_triggerdef(pg_trigger.oid, true) as triggerdef
    FROM pg_trigger 
    JOIN pg_class ON pg_class.oid = pg_trigger.tgrelid
    WHERE tgname IN (
      'on_auth_user_created',
      'appointments_status_transition_guard',
      'appointment_waitlist_status_transition_guard',
      'care_episodes_transition_trigger',
      'clinical_encounters_insert_trigger',
      'clinical_notes_transition_trigger',
      'clinical_documents_mutation_guard',
      'clinical_form_responses_transition_guard',
      'clinical_measurements_insert_guard',
      'messages_patient_mutation_guard',
      'trg_field_service_work_order_transition',
      'trg_field_service_work_order_status_history',
      'trg_field_service_status_history_append_only',
      'trg_field_service_assignment_invariants',
      'trg_field_service_work_report_transition'
    )
  `;
  
  const requiredTriggers = [
    { name: 'on_auth_user_created' },
    {
      name: 'appointments_status_transition_guard',
      table: 'appointments',
      requiredElements: ['before insert or update', 'for each row', 'enforce_appointment_status_transition'],
    },
    {
      name: 'appointment_waitlist_status_transition_guard',
      table: 'appointment_waitlist_entries',
      requiredElements: ['before insert or update', 'for each row', 'enforce_waitlist_status_transition'],
    },
    {
      name: 'care_episodes_transition_trigger',
      table: 'care_episodes',
      requiredElements: ['before insert or update', 'for each row', 'enforce_care_episode_transition'],
    },
    {
      name: 'clinical_encounters_insert_trigger',
      table: 'clinical_encounters',
      requiredElements: ['before insert', 'for each row', 'enforce_clinical_encounter_insert'],
    },
    {
      name: 'clinical_notes_transition_trigger',
      table: 'clinical_notes',
      requiredElements: ['before insert or update', 'for each row', 'enforce_clinical_note_transition'],
    },
    {
      name: 'clinical_documents_mutation_guard',
      table: 'clinical_documents',
      requiredElements: ['before update', 'for each row', 'enforce_clinical_document_mutation'],
    },
    {
      name: 'clinical_form_responses_transition_guard',
      table: 'clinical_form_responses',
      requiredElements: ['before insert or update', 'for each row', 'enforce_clinical_form_response_transition'],
    },
    {
      name: 'clinical_measurements_insert_guard',
      table: 'clinical_measurements',
      requiredElements: ['before insert', 'for each row', 'enforce_clinical_measurement_insert'],
    },
    {
      name: 'messages_patient_mutation_guard',
      table: 'messages',
      requiredElements: ['before update', 'for each row', 'enforce_patient_message_update'],
    },
    {
      name: 'trg_field_service_work_order_transition',
      table: 'field_service_work_orders',
      requiredElements: ['before insert or update', 'for each row', 'enforce_field_service_work_order_transition'],
    },
    {
      name: 'trg_field_service_work_order_status_history',
      table: 'field_service_work_orders',
      requiredElements: ['after insert or update', 'for each row', 'record_field_service_work_order_status_history'],
    },
    {
      name: 'trg_field_service_status_history_append_only',
      table: 'field_service_work_order_status_history',
      requiredElements: ['before', 'delete', 'update', 'for each row', 'enforce_field_service_status_history_append_only'],
    },
    {
      name: 'trg_field_service_assignment_invariants',
      table: 'field_service_work_order_assignments',
      requiredElements: ['before', 'insert', 'update', 'for each row', 'enforce_field_service_assignment_invariants'],
    },
    {
      name: 'trg_field_service_work_report_transition',
      table: 'field_service_work_reports',
      requiredElements: ['before', 'insert', 'update', 'delete', 'for each row', 'enforce_field_service_work_report_transition'],
    },
  ];

  for (const rt of requiredTriggers) {
    const match = triggers.find(t => t.tgname === rt.name && (!rt.table || t.relname === rt.table));
    if (!match) {
      console.error(`❌ ERROR: Trigger '${rt.name}' not found on table '${rt.table ?? 'any'}'.`);
      errorCount++;
    } else if (rt.requiredElements && match.triggerdef) {
      const normDef = match.triggerdef.toLowerCase().replace(/\s+/g, ' ');
      for (const el of rt.requiredElements) {
        if (!normDef.includes(el.toLowerCase())) {
          console.error(`❌ ERROR: Trigger '${rt.name}' missing definition element: '${el}'. Definition: '${match.triggerdef}'`);
          errorCount++;
        }
      }
    }
  }

  // 4. Verify RLS enabled and policies present for core tenant tables
  const expectedRlsTables = [
    'users', 'organizations', 'clients', 'contacts', 'deals', 'products', 
    'invoices', 'invoice_lines', 'tasks', 'message_templates', 'messages', 'requests',
    'practice_locations', 'practice_practitioners', 'practitioner_locations', 'practice_rooms', 'practice_resources',
    'patient_profiles', 'patient_representatives', 'patient_representative_links',
    'appointment_types', 'practitioner_availability_rules', 'practitioner_availability_exceptions', 'appointments',
    'appointment_waitlist_entries',
    'care_episodes',
    'clinical_encounters',
    'clinical_notes',
    'clinical_documents',
    'clinical_form_templates',
    'clinical_form_responses',
    'clinical_measurements',
    'field_service_sites',
    'field_service_work_orders',
    'field_service_work_order_assignments',
    'field_service_work_reports',
    'field_service_work_order_status_history'
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

  // 5. Exact Policy Contracts for Practice Structure & Patient Registry & Scheduling
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
    {
      policyName: 'appointment_types_tenant_isolation',
      tableName: 'appointment_types',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: commonProfessionalSemantics,
    },
    {
      policyName: 'practitioner_availability_rules_tenant_isolation',
      tableName: 'practitioner_availability_rules',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: commonProfessionalSemantics,
    },
    {
      policyName: 'practitioner_availability_exceptions_tenant_isolation',
      tableName: 'practitioner_availability_exceptions',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: commonProfessionalSemantics,
    },
    {
      policyName: 'appointments_tenant_isolation',
      tableName: 'appointments',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: commonProfessionalSemantics,
    },
    {
      policyName: 'appointment_waitlist_entries_tenant_isolation',
      tableName: 'appointment_waitlist_entries',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: commonProfessionalSemantics,
      withCheckSemantics: commonProfessionalSemantics,
    },
    {
      policyName: 'care_episodes_select_owner_only',
      tableName: 'care_episodes',
      expectedRoles: ['authenticated'],
      expectedCmd: 'SELECT',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
      withCheckSemantics: [],
    },
    {
      policyName: 'care_episodes_insert_owner_only',
      tableName: 'care_episodes',
      expectedRoles: ['authenticated'],
      expectedCmd: 'INSERT',
      qualSemantics: [],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
    },
    {
      policyName: 'care_episodes_update_owner_only',
      tableName: 'care_episodes',
      expectedRoles: ['authenticated'],
      expectedCmd: 'UPDATE',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
    },
    {
      policyName: 'clinical_encounters_select_owner_only',
      tableName: 'clinical_encounters',
      expectedRoles: ['authenticated'],
      expectedCmd: 'SELECT',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
      withCheckSemantics: [],
    },
    {
      policyName: 'clinical_encounters_insert_owner_only',
      tableName: 'clinical_encounters',
      expectedRoles: ['authenticated'],
      expectedCmd: 'INSERT',
      qualSemantics: [],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
    },
    {
      policyName: 'clinical_notes_select_owner_only',
      tableName: 'clinical_notes',
      expectedRoles: ['authenticated'],
      expectedCmd: 'SELECT',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'author_practitioner_id'],
      withCheckSemantics: [],
    },
    {
      policyName: 'clinical_notes_insert_owner_only',
      tableName: 'clinical_notes',
      expectedRoles: ['authenticated'],
      expectedCmd: 'INSERT',
      qualSemantics: [],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'author_practitioner_id'],
    },
    {
      policyName: 'clinical_notes_update_owner_only',
      tableName: 'clinical_notes',
      expectedRoles: ['authenticated'],
      expectedCmd: 'UPDATE',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'author_practitioner_id'],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'author_practitioner_id'],
    },
    {
      policyName: 'clinical_documents_select_owner_only',
      tableName: 'clinical_documents',
      expectedRoles: ['authenticated'],
      expectedCmd: 'SELECT',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
      withCheckSemantics: [],
    },
    {
      policyName: 'clinical_documents_insert_owner_only',
      tableName: 'clinical_documents',
      expectedRoles: ['authenticated'],
      expectedCmd: 'INSERT',
      qualSemantics: [],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
    },
    {
      policyName: 'clinical_documents_update_owner_only',
      tableName: 'clinical_documents',
      expectedRoles: ['authenticated'],
      expectedCmd: 'UPDATE',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
    },
    {
      policyName: 'clinical_form_templates_select_owner_only',
      tableName: 'clinical_form_templates',
      expectedRoles: ['authenticated'],
      expectedCmd: 'SELECT',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
      withCheckSemantics: [],
    },
    {
      policyName: 'clinical_form_templates_insert_owner_only',
      tableName: 'clinical_form_templates',
      expectedRoles: ['authenticated'],
      expectedCmd: 'INSERT',
      qualSemantics: [],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
    },
    {
      policyName: 'clinical_form_templates_update_owner_only',
      tableName: 'clinical_form_templates',
      expectedRoles: ['authenticated'],
      expectedCmd: 'UPDATE',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
    },
    {
      policyName: 'clinical_form_responses_select_owner_only',
      tableName: 'clinical_form_responses',
      expectedRoles: ['authenticated'],
      expectedCmd: 'SELECT',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
      withCheckSemantics: [],
    },
    {
      policyName: 'clinical_form_responses_insert_owner_only',
      tableName: 'clinical_form_responses',
      expectedRoles: ['authenticated'],
      expectedCmd: 'INSERT',
      qualSemantics: [],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
    },
    {
      policyName: 'clinical_form_responses_update_owner_only',
      tableName: 'clinical_form_responses',
      expectedRoles: ['authenticated'],
      expectedCmd: 'UPDATE',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
    },
    {
      policyName: 'clinical_measurements_select_owner_only',
      tableName: 'clinical_measurements',
      expectedRoles: ['authenticated'],
      expectedCmd: 'SELECT',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
      withCheckSemantics: [],
    },
    {
      policyName: 'clinical_measurements_insert_owner_only',
      tableName: 'clinical_measurements',
      expectedRoles: ['authenticated'],
      expectedCmd: 'INSERT',
      qualSemantics: [],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
    },
    {
      policyName: 'patient_portal_access_practitioner_all',
      tableName: 'patient_portal_access',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id'],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id'],
    },
    {
      policyName: 'patient_portal_access_user_select',
      tableName: 'patient_portal_access',
      expectedRoles: ['authenticated'],
      expectedCmd: 'SELECT',
      qualSemantics: ['user_id', 'auth.uid', 'is_active', 'client'],
      withCheckSemantics: [],
    },
    {
      policyName: 'patient_questionnaires_practitioner_all',
      tableName: 'patient_questionnaire_assignments',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id', 'practitioner_id'],
    },
    {
      policyName: 'patient_questionnaires_user_select',
      tableName: 'patient_questionnaire_assignments',
      expectedRoles: ['authenticated'],
      expectedCmd: 'SELECT',
      qualSemantics: ['patient_id', 'patient_portal_access', 'user_id', 'auth.uid', 'is_active', 'client'],
      withCheckSemantics: [],
    },
    {
      policyName: 'patient_billing_links_practitioner_all',
      tableName: 'patient_billing_links',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: ['current_organization_id', 'current_clinical_practitioner_id'],
      withCheckSemantics: ['current_organization_id', 'current_clinical_practitioner_id'],
    },
    {
      policyName: 'messages_select_policy',
      tableName: 'messages',
      expectedRoles: ['authenticated'],
      expectedCmd: 'SELECT',
      qualSemantics: ['patient_id', 'sender_id', 'receiver_id', 'auth.uid', 'patient_portal_access', 'care_episodes'],
      withCheckSemantics: [],
    },
    {
      policyName: 'messages_insert_policy',
      tableName: 'messages',
      expectedRoles: ['authenticated'],
      expectedCmd: 'INSERT',
      qualSemantics: [],
      withCheckSemantics: ['sender_id', 'auth.uid', 'can_insert_patient_message'],
    },
    {
      policyName: 'messages_update_policy',
      tableName: 'messages',
      expectedRoles: ['authenticated'],
      expectedCmd: 'UPDATE',
      qualSemantics: ['patient_id', 'receiver_id', 'sender_id', 'auth.uid', 'patient_portal_access', 'care_episodes'],
      withCheckSemantics: ['patient_id', 'receiver_id', 'sender_id', 'auth.uid', 'patient_portal_access', 'care_episodes'],
    },
    {
      policyName: 'messages_delete_policy',
      tableName: 'messages',
      expectedRoles: ['authenticated'],
      expectedCmd: 'DELETE',
      qualSemantics: ['patient_id', 'sender_id', 'auth.uid'],
      withCheckSemantics: [],
    },
    {
      policyName: 'field_service_sites_professional_policy',
      tableName: 'field_service_sites',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: ['is_current_field_service_professional'],
      withCheckSemantics: ['is_current_field_service_professional'],
    },
    {
      policyName: 'field_service_work_orders_professional_policy',
      tableName: 'field_service_work_orders',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: ['is_current_field_service_professional'],
      withCheckSemantics: ['is_current_field_service_professional'],
    },
    {
      policyName: 'field_service_assignments_professional_policy',
      tableName: 'field_service_work_order_assignments',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: ['is_current_field_service_professional'],
      withCheckSemantics: ['is_current_field_service_professional'],
    },
    {
      policyName: 'field_service_reports_professional_policy',
      tableName: 'field_service_work_reports',
      expectedRoles: ['authenticated'],
      expectedCmd: 'ALL',
      qualSemantics: ['is_current_field_service_professional'],
      withCheckSemantics: ['is_current_field_service_professional'],
    },
    {
      policyName: 'field_service_status_history_professional_policy',
      tableName: 'field_service_work_order_status_history',
      expectedRoles: ['authenticated'],
      expectedCmd: 'SELECT',
      qualSemantics: ['is_current_field_service_professional'],
      withCheckSemantics: [],
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

    // Check qual present & semantics if expected
    if (ep.qualSemantics.length > 0) {
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
    }

    // Check with_check present & semantics if expected
    if (ep.withCheckSemantics.length > 0) {
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
  }

  // 6. Verify Private Storage Bucket 'clinical-documents'
  const storageBuckets = await sql`
    SELECT id, name, public, file_size_limit, allowed_mime_types
    FROM storage.buckets
    WHERE id = 'clinical-documents'
  `;

  if (storageBuckets.length === 0) {
    console.error(`❌ ERROR: Storage bucket 'clinical-documents' not found in database.`);
    errorCount++;
  } else {
    const bucket = storageBuckets[0];
    if (bucket.public !== false) {
      console.error(`❌ ERROR: Storage bucket 'clinical-documents' must NOT be public (public=${bucket.public}).`);
      errorCount++;
    }
    if (bucket.file_size_limit !== 10485760 && bucket.file_size_limit !== '10485760') {
      console.error(`❌ ERROR: Storage bucket 'clinical-documents' file_size_limit is ${bucket.file_size_limit}, expected 10485760.`);
      errorCount++;
    }
  }

  // Verify Storage Objects RLS policies
  const storagePolicies = await sql`
    SELECT policyname, tablename, roles, cmd, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
  `;

  const expectedStoragePolicies = [
    'clinical_documents_storage_select_owner_only',
    'clinical_documents_storage_insert_owner_only',
    'clinical_documents_storage_update_owner_only',
  ];

  for (const polName of expectedStoragePolicies) {
    const found = storagePolicies.find(p => p.policyname === polName);
    if (!found) {
      console.error(`❌ ERROR: Storage policy '${polName}' on storage.objects not found.`);
      errorCount++;
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
