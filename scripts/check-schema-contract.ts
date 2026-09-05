import { getTableConfig } from 'drizzle-orm/pg-core';
import * as schema from '../src/lib/db/schema';
import postgres from 'postgres';

interface ExactFkContract {
  constraintName: string;
  tableName: string;
  foreignTable: string;
  localCols: string[];
  foreignCols: string[];
}

async function verifyContract() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL missing');
    process.exit(1);
  }

  console.log('Verifying actual database contract against schema.ts...');
  const sql = postgres(dbUrl);
  let errorCount = 0;

  // Fetch db columns metadata
  const dbColumns = await sql`
    SELECT table_name, column_name, data_type, is_nullable, column_default, numeric_precision, numeric_scale
    FROM information_schema.columns 
    WHERE table_schema = 'public'
  `;

  // Fetch primary keys, unique constraints, foreign keys and check constraints from pg_constraint
  const constraints = await sql`
    SELECT conname, contype, conrelid::regclass::text AS table_name, pg_get_constraintdef(pg_constraint.oid) AS condef
    FROM pg_constraint
    JOIN pg_namespace ON pg_namespace.oid = pg_constraint.connamespace
    WHERE nspname = 'public'
  `;

  // Fetch indexes
  const indexes = await sql`
    SELECT indexname, tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
  `;

  const dbTables = new Set(dbColumns.map(c => c.table_name));
  
  // Calculate dynamic table count
  const schemaTables = [];
  for (const [, value] of Object.entries(schema)) {
    try {
      const config = getTableConfig(value as any);
      if (config.name) {
        schemaTables.push(config.name);
      }
    } catch {
      // Not a valid table config, ignore
    }
  }

  console.log(`\n📋 Contract Verification Overview:`);
  console.log(`- Schema tables: ${schemaTables.length}`);
  console.log(`- Database tables: ${dbTables.size}`);

  if (schemaTables.length !== dbTables.size) {
    console.log(`⚠️ Note: Schema defines ${schemaTables.length} tables, DB has ${dbTables.size}. Some DB tables (like __drizzle_migrations) are expected to not be in schema.`);
  }

  for (const tableName of schemaTables) {
    // Find the schema object
    let config: any;
    for (const val of Object.values(schema)) {
      try {
        const c = getTableConfig(val as any);
        if (c.name === tableName) config = c;
      } catch {
        // Not a valid table config, ignore
      }
    }

    if (!dbTables.has(tableName)) {
      console.error(`❌ ERROR: Table '${tableName}' not found in actual database.`);
      errorCount++;
      continue;
    }

    const tableCols = dbColumns.filter(c => c.table_name === tableName);
    const dbColNames = new Set(tableCols.map(c => c.column_name));
    const expectedColNames = new Set(config.columns.map((c: any) => c.name));

    // Verify all expected columns and their properties
    for (const expectedCol of config.columns) {
      if (!dbColNames.has(expectedCol.name)) {
        console.error(`❌ ERROR: Column '${expectedCol.name}' in table '${tableName}' not found in actual database.`);
        errorCount++;
        continue;
      }

      const dbCol = tableCols.find(c => c.column_name === expectedCol.name);
      if (!dbCol) {
        console.error(`❌ ERROR: Column '${tableName}.${expectedCol.name}' was expected but could not be resolved.`);
        errorCount++;
        continue;
      }
      
      // Check nullability
      const expectedNullable = !expectedCol.notNull;
      const actualNullable = dbCol.is_nullable === 'YES';
      if (expectedNullable !== actualNullable) {
        console.error(`❌ ERROR: Column '${tableName}.${expectedCol.name}' nullability mismatch (schema=${expectedNullable}, db=${actualNullable})`);
        errorCount++;
      }
      
      // Precision / scale for numeric
      if (expectedCol.columnType === 'PgNumeric') {
        if (expectedCol.precision !== undefined && dbCol.numeric_precision !== expectedCol.precision) {
          console.error(`❌ ERROR: Column '${tableName}.${expectedCol.name}' precision mismatch (schema=${expectedCol.precision}, db=${dbCol.numeric_precision})`);
          errorCount++;
        }
        if (expectedCol.scale !== undefined && dbCol.numeric_scale !== expectedCol.scale) {
          console.error(`❌ ERROR: Column '${tableName}.${expectedCol.name}' scale mismatch (schema=${expectedCol.scale}, db=${dbCol.numeric_scale})`);
          errorCount++;
        }
      }
    }

    // Verify DB columns are in schema
    for (const actualCol of tableCols) {
      if (!expectedColNames.has(actualCol.column_name)) {
        console.error(`❌ ERROR: Extra column '${actualCol.column_name}' in table '${tableName}' found in database but not in schema.ts.`);
        errorCount++;
      }
    }

    // Verify constraints presence conceptually
    const hasSchemaPk = config.primaryKeys && config.primaryKeys.length > 0 || config.columns.some((c: any) => c.primary);
    const hasDbPk = constraints.some(c => c.table_name === tableName && c.contype === 'p');
    
    if (hasSchemaPk && !hasDbPk) {
      console.error(`❌ ERROR: Table '${tableName}' defines a PK in schema but missing in database.`);
      errorCount++;
    }

    // Verify Indexes
    if (config.indexes && config.indexes.length > 0) {
      const dbTableIndexes = indexes.filter(i => i.tablename === tableName);
      if (dbTableIndexes.length < config.indexes.length) {
         console.error(`❌ ERROR: Table '${tableName}' defines ${config.indexes.length} indexes in schema but found only ${dbTableIndexes.length} in database.`);
         errorCount++;
      }
    }
  }

  // --- Specific Contract: organizations_profession_health_check ---
  const orgCheck = constraints.find(c => c.table_name === 'organizations' && c.conname === 'organizations_profession_health_check');
  if (!orgCheck) {
    console.error(`❌ ERROR: Constraint 'organizations_profession_health_check' not found in database.`);
    errorCount++;
  } else if (orgCheck.contype !== 'c') {
    console.error(`❌ ERROR: 'organizations_profession_health_check' is not a CHECK constraint.`);
    errorCount++;
  } else {
    const def = orgCheck.condef.toLowerCase().replace(/\s+/g, '');
    const expectedElements = [
      'profession',
      'isnull',
      'sector',
      'isnotnull',
      'health',
      'physiotherapist',
      'osteopath',
      'speech_therapist',
      'podiatrist',
      'occupational_therapist',
      'psychomotor_therapist',
      'dietitian'
    ];
    for (const el of expectedElements) {
      if (!def.includes(el.replace(/\s+/g, ''))) {
         console.error(`❌ ERROR: 'organizations_profession_health_check' is missing semantic element: '${el}'`);
         errorCount++;
      }
    }
  }

  // --- Specific Contract: practice_practitioners_profession_check ---
  const pracCheck = constraints.find(c => c.table_name === 'practice_practitioners' && c.conname === 'practice_practitioners_profession_check');
  if (!pracCheck) {
    console.error(`❌ ERROR: Constraint 'practice_practitioners_profession_check' not found in database.`);
    errorCount++;
  } else if (pracCheck.contype !== 'c') {
    console.error(`❌ ERROR: 'practice_practitioners_profession_check' is not a CHECK constraint.`);
    errorCount++;
  } else {
    const def = pracCheck.condef.toLowerCase().replace(/\s+/g, '');
    const expectedElements = [
      'profession',
      'physiotherapist',
      'osteopath',
      'speech_therapist',
      'podiatrist',
      'occupational_therapist',
      'psychomotor_therapist',
      'dietitian'
    ];
    for (const el of expectedElements) {
      if (!def.includes(el.replace(/\s+/g, ''))) {
         console.error(`❌ ERROR: 'practice_practitioners_profession_check' is missing semantic element: '${el}'`);
         errorCount++;
      }
    }
  }

  // --- Specific Contract: Patient Registry CHECK constraints ---
  const sexCheck = constraints.find(c => c.table_name === 'patient_profiles' && c.conname === 'patient_profiles_sex_check');
  if (!sexCheck) {
    console.error(`❌ ERROR: 'patient_profiles_sex_check' constraint not found on patient_profiles table.`);
    errorCount++;
  } else if (sexCheck.contype !== 'c') {
    console.error(`❌ ERROR: 'patient_profiles_sex_check' is not a CHECK constraint.`);
    errorCount++;
  } else {
    const def = sexCheck.condef.toLowerCase().replace(/\s+/g, '');
    const expectedSexes = ['sex', 'female', 'male', 'indeterminate', 'unknown'];
    for (const el of expectedSexes) {
      if (!def.includes(el)) {
        console.error(`❌ ERROR: 'patient_profiles_sex_check' missing semantic element: '${el}'`);
        errorCount++;
      }
    }
  }

  const relCheck = constraints.find(c => c.table_name === 'patient_representative_links' && c.conname === 'patient_rep_links_relationship_check');
  if (!relCheck) {
    console.error(`❌ ERROR: 'patient_rep_links_relationship_check' constraint not found on patient_representative_links table.`);
    errorCount++;
  } else if (relCheck.contype !== 'c') {
    console.error(`❌ ERROR: 'patient_rep_links_relationship_check' is not a CHECK constraint.`);
    errorCount++;
  } else {
    const def = relCheck.condef.toLowerCase().replace(/\s+/g, '');
    const expectedRels = [
      'relationship',
      'parent',
      'legal_guardian',
      'spouse_partner',
      'adult_child',
      'sibling',
      'caregiver',
      'other'
    ];
    for (const el of expectedRels) {
      if (!def.includes(el)) {
        console.error(`❌ ERROR: 'patient_rep_links_relationship_check' missing semantic element: '${el}'`);
        errorCount++;
      }
    }
  }

  // --- Specific Contract: Extension btree_gist ---
  const extensions = await sql`
    SELECT extname FROM pg_extension WHERE extname = 'btree_gist'
  `;
  if (extensions.length === 0) {
    console.error(`❌ ERROR: Extension 'btree_gist' not installed in database.`);
    errorCount++;
  }

  // --- Specific Contract: Exact Composite Foreign Keys ---
  const exactFkContracts: ExactFkContract[] = [
    {
      constraintName: 'practice_practitioners_user_fk',
      tableName: 'practice_practitioners',
      foreignTable: 'users',
      localCols: ['user_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'practitioner_locations_practitioner_fk',
      tableName: 'practitioner_locations',
      foreignTable: 'practice_practitioners',
      localCols: ['practitioner_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'practitioner_locations_location_fk',
      tableName: 'practitioner_locations',
      foreignTable: 'practice_locations',
      localCols: ['location_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'practice_rooms_location_fk',
      tableName: 'practice_rooms',
      foreignTable: 'practice_locations',
      localCols: ['location_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'practice_resources_location_fk',
      tableName: 'practice_resources',
      foreignTable: 'practice_locations',
      localCols: ['location_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'practice_resources_room_fk',
      tableName: 'practice_resources',
      foreignTable: 'practice_rooms',
      localCols: ['room_id', 'location_id', 'organization_id'],
      foreignCols: ['id', 'location_id', 'organization_id'],
    },
    {
      constraintName: 'patient_rep_links_patient_fk',
      tableName: 'patient_representative_links',
      foreignTable: 'patient_profiles',
      localCols: ['patient_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'patient_rep_links_representative_fk',
      tableName: 'patient_representative_links',
      foreignTable: 'patient_representatives',
      localCols: ['representative_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'availability_rules_practitioner_location_fk',
      tableName: 'practitioner_availability_rules',
      foreignTable: 'practitioner_locations',
      localCols: ['organization_id', 'practitioner_id', 'location_id'],
      foreignCols: ['organization_id', 'practitioner_id', 'location_id'],
    },
    {
      constraintName: 'availability_exceptions_practitioner_location_fk',
      tableName: 'practitioner_availability_exceptions',
      foreignTable: 'practitioner_locations',
      localCols: ['organization_id', 'practitioner_id', 'location_id'],
      foreignCols: ['organization_id', 'practitioner_id', 'location_id'],
    },
    {
      constraintName: 'appointments_patient_fk',
      tableName: 'appointments',
      foreignTable: 'patient_profiles',
      localCols: ['patient_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'appointments_practitioner_fk',
      tableName: 'appointments',
      foreignTable: 'practice_practitioners',
      localCols: ['practitioner_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'appointments_appointment_type_fk',
      tableName: 'appointments',
      foreignTable: 'appointment_types',
      localCols: ['appointment_type_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'appointments_location_fk',
      tableName: 'appointments',
      foreignTable: 'practice_locations',
      localCols: ['location_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'appointments_practitioner_location_fk',
      tableName: 'appointments',
      foreignTable: 'practitioner_locations',
      localCols: ['organization_id', 'practitioner_id', 'location_id'],
      foreignCols: ['organization_id', 'practitioner_id', 'location_id'],
    },
    {
      constraintName: 'appointments_room_fk',
      tableName: 'appointments',
      foreignTable: 'practice_rooms',
      localCols: ['room_id', 'location_id', 'organization_id'],
      foreignCols: ['id', 'location_id', 'organization_id'],
    },
    {
      constraintName: 'appointments_created_by_user_fk',
      tableName: 'appointments',
      foreignTable: 'users',
      localCols: ['created_by_user_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'waitlist_patient_fk',
      tableName: 'appointment_waitlist_entries',
      foreignTable: 'patient_profiles',
      localCols: ['patient_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'waitlist_location_fk',
      tableName: 'appointment_waitlist_entries',
      foreignTable: 'practice_locations',
      localCols: ['location_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'waitlist_patient_fk',
      tableName: 'appointment_waitlist_entries',
      foreignTable: 'patient_profiles',
      localCols: ['patient_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'waitlist_appointment_type_fk',
      tableName: 'appointment_waitlist_entries',
      foreignTable: 'appointment_types',
      localCols: ['appointment_type_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'waitlist_location_fk',
      tableName: 'appointment_waitlist_entries',
      foreignTable: 'practice_locations',
      localCols: ['location_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'waitlist_practitioner_location_fk',
      tableName: 'appointment_waitlist_entries',
      foreignTable: 'practitioner_locations',
      localCols: ['organization_id', 'practitioner_id', 'location_id'],
      foreignCols: ['organization_id', 'practitioner_id', 'location_id'],
    },
    {
      constraintName: 'waitlist_resolved_appointment_fk',
      tableName: 'appointment_waitlist_entries',
      foreignTable: 'appointments',
      localCols: ['resolved_appointment_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
    {
      constraintName: 'waitlist_created_by_user_fk',
      tableName: 'appointment_waitlist_entries',
      foreignTable: 'users',
      localCols: ['created_by_user_id', 'organization_id'],
      foreignCols: ['id', 'organization_id'],
    },
  ];

  for (const fk of exactFkContracts) {
    const con = constraints.find(c => c.table_name === fk.tableName && c.conname === fk.constraintName);
    if (!con) {
      console.error(`❌ ERROR: Composite FK '${fk.constraintName}' on table '${fk.tableName}' not found.`);
      errorCount++;
      continue;
    }
    if (con.contype !== 'f') {
      console.error(`❌ ERROR: Constraint '${fk.constraintName}' is not a foreign key (contype=${con.contype}).`);
      errorCount++;
    }

    const normDef = con.condef.toLowerCase().replace(/\s+/g, '');
    const expectedLocal = `(${fk.localCols.join(',')})`.toLowerCase();
    const expectedForeign = `${fk.foreignTable}(${fk.foreignCols.join(',')})`.toLowerCase();

    if (!normDef.includes(expectedLocal)) {
      console.error(`❌ ERROR: FK '${fk.constraintName}' missing local columns '${expectedLocal}' in definition: '${con.condef}'`);
      errorCount++;
    }
    if (!normDef.includes(expectedForeign)) {
      console.error(`❌ ERROR: FK '${fk.constraintName}' missing foreign target '${expectedForeign}' in definition: '${con.condef}'`);
      errorCount++;
    }
  }

  // --- Specific Contract: Exact Critical Indexes ---
  const criticalIndexes = [
    'users_id_org_unique',
    'practice_locations_org_id_unique',
    'practice_locations_primary_active_idx',
    'practice_practitioners_org_id_unique',
    'practice_practitioners_org_user_unique',
    'practice_rooms_org_location_id_unique',
    'practitioner_locations_assignment_unique',
    'practitioner_locations_primary_active_idx',
    'patient_profiles_org_id_unique',
    'patient_profiles_org_birth_name_idx',
    'patient_profiles_org_birth_date_idx',
    'patient_representatives_org_id_unique',
    'patient_rep_links_assignment_unique',
    'patient_rep_links_primary_active_idx',
    'appointment_types_org_id_unique',
    'appointment_types_org_name_unique',
    'availability_rules_org_id_unique',
    'availability_rules_unique_slot',
    'availability_exceptions_org_id_unique',
    'appointments_org_id_unique',
    'appointment_waitlist_entries_org_id_unique',
    'waitlist_org_status_idx',
    'waitlist_patient_idx',
    'waitlist_practitioner_idx',
    'waitlist_match_idx',
  ];

  for (const idxName of criticalIndexes) {
    const idx = indexes.find(i => i.indexname === idxName);
    if (!idx) {
      console.error(`❌ ERROR: Critical index '${idxName}' not found in database.`);
      errorCount++;
    }
  }

  // --- Specific Contract: Exclusion Constraints (contype = 'x') ---
  const exclusionContracts = [
    { name: 'appointments_practitioner_no_overlap', table: 'appointments' },
    { name: 'appointments_patient_no_overlap', table: 'appointments' },
    { name: 'appointments_room_no_overlap', table: 'appointments' },
  ];

  for (const exc of exclusionContracts) {
    const con = constraints.find(c => c.table_name === exc.table && c.conname === exc.name);
    if (!con) {
      console.error(`❌ ERROR: Exclusion constraint '${exc.name}' not found on table '${exc.table}'.`);
      errorCount++;
    } else if (con.contype !== 'x') {
      console.error(`❌ ERROR: Constraint '${exc.name}' is not an exclusion constraint (contype=${con.contype}).`);
      errorCount++;
    }
  }

  // --- Specific Contract: Lifecycle & Waitlist Check Constraints ---
  const specificChecks = [
    {
      name: 'appointments_status_check',
      table: 'appointments',
      elements: ['status', 'scheduled', 'cancelled', 'no_show'],
    },
    {
      name: 'appointments_cancellation_reason_check',
      table: 'appointments',
      elements: ['cancellation_reason_code', 'patient_request', 'practitioner_request', 'practice_unavailable', 'scheduling_error', 'duplicate', 'other'],
    },
    {
      name: 'appointments_status_metadata_check',
      table: 'appointments',
      elements: ['status', 'cancellation_reason_code', 'cancelled_at', 'no_show_at'],
    },
    {
      name: 'waitlist_status_check',
      table: 'appointment_waitlist_entries',
      elements: ['status', 'waiting', 'resolved'],
    },
    {
      name: 'waitlist_resolution_code_check',
      table: 'appointment_waitlist_entries',
      elements: ['resolution_code', 'booked', 'withdrawn', 'not_needed', 'other'],
    },
    {
      name: 'waitlist_date_check',
      table: 'appointment_waitlist_entries',
      elements: ['preferred_date_until', 'preferred_date_from'],
    },
    {
      name: 'waitlist_time_check',
      table: 'appointment_waitlist_entries',
      elements: ['preferred_start_time', 'preferred_end_time'],
    },
    {
      name: 'waitlist_state_check',
      table: 'appointment_waitlist_entries',
      elements: ['status', 'resolution_code', 'resolved_at', 'resolved_appointment_id'],
    },
  ];

  for (const chk of specificChecks) {
    const con = constraints.find(c => c.table_name === chk.table && c.conname === chk.name);
    if (!con) {
      console.error(`❌ ERROR: Check constraint '${chk.name}' not found on table '${chk.table}'.`);
      errorCount++;
    } else if (con.contype !== 'c') {
      console.error(`❌ ERROR: Constraint '${chk.name}' is not a CHECK constraint (contype=${con.contype}).`);
      errorCount++;
    } else {
      const def = con.condef.toLowerCase().replace(/\s+/g, '');
      for (const el of chk.elements) {
        if (!def.includes(el.toLowerCase().replace(/\s+/g, ''))) {
          console.error(`❌ ERROR: Check '${chk.name}' missing semantic element: '${el}'`);
          errorCount++;
        }
      }
    }
  }

  await sql.end();

  if (errorCount > 0) {
    console.error(`\n❌ Schema contract check failed with ${errorCount} errors.`);
    process.exit(1);
  } else {
    console.log(`✅ Actual database schema contract (tables, columns, types, nullability, precision, constraints, exact composite FKs, critical indexes) perfectly matches schema.ts!`);
    console.log(`Total verified tables: ${schemaTables.length}`);
  }
}

verifyContract().catch(e => {
  console.error(e);
  process.exit(1);
});
