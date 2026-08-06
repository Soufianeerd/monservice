import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

// PostgreSQL dans tous les environnements : le dialecte n'est plus
// conditionnel (voir anomalies MS-011 et MS-021).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle/postgres',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
