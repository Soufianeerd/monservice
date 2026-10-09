import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config({ path: process.env.NEON_ADMIN_ENV_FILE ?? '.env.neon-admin.local' });

// PostgreSQL dans tous les environnements : le dialecte n'est plus
// conditionnel (voir anomalies MS-011 et MS-021).
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './drizzle/neon-generated',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
});
