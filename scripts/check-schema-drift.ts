import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

try {
  console.log('Checking for schema drift...');
  
  const migrationsDir = path.join(__dirname, '../drizzle/postgres');
  const getFiles = () => fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  
  const filesBefore = getFiles();

  // 1. Check migration history consistency
  console.log('Checking migration history consistency...');
  execSync(`npx drizzle-kit check`, { stdio: 'inherit' });

  // 2. Generate migrations into the actual migrations directory
  // If there's drift, drizzle-kit will create a new migration file.
  console.log('Checking for schema drift (schema.ts vs snapshot)...');
  execSync(`npx drizzle-kit generate`, { stdio: 'inherit' });
  
  const filesAfter = getFiles();
  
  // Find newly generated files
  const newFiles = filesAfter.filter(f => !filesBefore.includes(f));
  
  if (newFiles.length > 0) {
    console.error('❌ ERROR: Schema drift detected! `src/lib/db/schema.ts` does not match the latest migrations.');
    console.error(`Drizzle generated the following new files to catch up: ${newFiles.join(', ')}`);
    console.error('Please run `npm run db:generate` locally and commit the resulting migration files.');
    
    // Clean up the generated drift files so they don't pollute CI workspace
    for (const f of newFiles) {
      fs.rmSync(path.join(migrationsDir, f), { force: true });
    }
    // Also cleanup snapshot json if generated
    if (fs.existsSync(path.join(migrationsDir, 'meta'))) {
      const journalPath = path.join(migrationsDir, 'meta', '_journal.json');
      if (fs.existsSync(journalPath)) {
        // Simple way to clean up the journal: we could use git checkout, but let's just restore git status
        try {
          execSync('git checkout -- ' + path.join(migrationsDir, 'meta'), { stdio: 'ignore' });
        } catch (e) {
          // Ignore error
        }
      }
      try {
        execSync('git clean -fd ' + path.join(migrationsDir, 'meta'), { stdio: 'ignore' });
      } catch (e) {
        // Ignore error
      }
    }
    
    process.exitCode = 1;
  } else {
    console.log('✅ No schema drift detected.');
  }
} catch (error) {
  console.error('❌ ERROR: Failed to run drift check.');
  console.error(error);
  process.exitCode = 1;
}
