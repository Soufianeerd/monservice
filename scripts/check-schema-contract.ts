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

  const dbColumns = await sql`
    SELECT table_name, column_name, data_type, is_nullable 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
  `;

  const dbTables = new Set(dbColumns.map(c => c.table_name));
  let errorCount = 0;

  for (const [key, value] of Object.entries(schema)) {
    try {
      const config = getTableConfig(value as any);
      const tableName = config.name;
      
      if (!dbTables.has(tableName)) {
        console.error(`❌ ERROR: Table '${tableName}' not found in actual database.`);
        errorCount++;
        continue;
      }

      const tableCols = dbColumns.filter(c => c.table_name === tableName);
      const dbColNames = new Set(tableCols.map(c => c.column_name));
      const expectedColNames = new Set(config.columns.map(c => c.name));

      // Verify all expected columns exist
      for (const expectedCol of config.columns) {
        if (!dbColNames.has(expectedCol.name)) {
          console.error(`❌ ERROR: Column '${expectedCol.name}' in table '${tableName}' not found in actual database.`);
          errorCount++;
        }
      }

      // Verify no extra columns in the database (strict contract)
      for (const actualCol of tableCols) {
        if (!expectedColNames.has(actualCol.column_name)) {
          // ignore PostGIS or Supabase specific injected columns if any, but ideally they match perfectly.
          console.error(`❌ ERROR: Extra column '${actualCol.column_name}' in table '${tableName}' found in database but not in schema.ts.`);
          errorCount++;
        }
      }

    } catch (e) {
      // Ignore exports that are not Drizzle tables
    }
  }

  await sql.end();

  if (errorCount > 0) {
    console.error(`\n❌ Schema contract check failed with ${errorCount} errors.`);
    process.exit(1);
  } else {
    console.log('✅ Actual database schema contract (tables & columns) perfectly matches schema.ts!');
  }
}

verifyContract().catch(e => {
  console.error(e);
  process.exit(1);
});
