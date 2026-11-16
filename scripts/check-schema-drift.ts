import { spawnSync } from 'node:child_process';
// Read-only target ledger verification; never generate into closed history or
// reset/clean repository files while checking drift.
const result=spawnSync(process.execPath,['scripts/neon/check-migrations.mjs'],{stdio:'inherit',env:process.env});
process.exitCode=result.status ?? 1;
