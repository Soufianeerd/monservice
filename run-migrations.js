// Compatibility entry point; historical provider migrations remain closed.
const { spawnSync } = require('node:child_process');
const result = spawnSync(process.execPath, ['scripts/neon/migrate.mjs'], { stdio: 'inherit', env: process.env });
process.exitCode = result.status ?? 1;
