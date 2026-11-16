/** Read-only source inventory. Credentials are loaded from the private export
 * environment by scripts/neon/source-inventory.mjs, never embedded in code. */
import { spawnSync } from 'node:child_process';
const result=spawnSync(process.execPath,['scripts/neon/source-inventory.mjs'],{stdio:'inherit',env:process.env});
process.exitCode=result.status ?? 1;
