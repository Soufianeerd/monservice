import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const tempConfigPath = 'drizzle.drift.config.ts';
const tempOutDir = 'drizzle/temp-drift-check';

try {
  console.log('Checking for schema drift...');
  
  // Create a temporary config file that points to the temp out directory
  fs.writeFileSync(tempConfigPath, `
import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/lib/db/schema.ts',
  out: './${tempOutDir}',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
  `);

  // Generate migrations into a temporary directory using the temporary config
  execSync(`npx drizzle-kit generate --config=${tempConfigPath}`, { stdio: 'pipe' });
  
  const files = fs.existsSync(tempOutDir) ? fs.readdirSync(tempOutDir).filter(f => f.endsWith('.sql')) : [];
  
  if (files.length > 0) {
    console.error('❌ ERROR: Schema drift detected! `src/lib/db/schema.ts` does not match the latest migrations.');
    console.error('Please run `npm run db:generate` to create a migration for your schema changes.');
    process.exitCode = 1;
  } else {
    console.log('✅ No schema drift detected.');
  }
} catch (error) {
  console.error('❌ ERROR: Failed to run drift check.');
  console.error(error);
  process.exitCode = 1;
} finally {
  // Clean up
  if (fs.existsSync(tempConfigPath)) {
    fs.rmSync(tempConfigPath, { force: true });
  }
  if (fs.existsSync(tempOutDir)) {
    fs.rmSync(tempOutDir, { recursive: true, force: true });
  }
}
