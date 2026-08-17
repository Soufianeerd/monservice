import { getTableName } from 'drizzle-orm';
import { getTableConfig } from 'drizzle-orm/pg-core';
import * as schema from '../src/lib/db/schema';

for (const [key, value] of Object.entries(schema)) {
  try {
    const config = getTableConfig(value as any);
    console.log(`Table: ${config.name}`);
    console.log(`Columns: ${config.columns.map(c => c.name).join(', ')}`);
  } catch (e) {
    // ignore non-tables
  }
}
