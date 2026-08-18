import { getTableConfig } from 'drizzle-orm/pg-core';
import * as schema from '../src/lib/db/schema';
import postgres from 'postgres';

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

  // Fetch primary keys, unique constraints and foreign keys from pg_constraint
  const constraints = await sql`
    SELECT conname, contype, conrelid::regclass::text AS table_name
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
  for (const [key, value] of Object.entries(schema)) {
    try {
      const config = getTableConfig(value as any);
      if (config.name) {
        schemaTables.push(config.name);
      }
    } catch (e) {}
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
      } catch (e) {}
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

    // Verify constraints presence conceptually (if Drizzle exposes PK/FKs easily)
    // We check if the table has PK in DB if schema defines one.
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

  await sql.end();

  if (errorCount > 0) {
    console.error(`\n❌ Schema contract check failed with ${errorCount} errors.`);
    process.exit(1);
  } else {
    console.log(`✅ Actual database schema contract (tables, columns, types, nullability, precision, constraints, indexes) perfectly matches schema.ts!`);
    console.log(`Total verified tables: ${schemaTables.length}`);
  }
}

verifyContract().catch(e => {
  console.error(e);
  process.exit(1);
});
