import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

export default defineConfig({
  dialect: process.env.DATABASE_URL?.startsWith('postgres') ? 'postgresql' : 'sqlite',
  schema: './src/lib/db/schema.ts',
  out: process.env.DATABASE_URL?.startsWith('postgres') ? './drizzle/postgres' : './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL || './database.sqlite',
  },
});
