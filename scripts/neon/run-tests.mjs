import fs from 'node:fs';
import dotenv from 'dotenv';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';

const runtime = dotenv.parse(fs.readFileSync(process.env.NEON_RUNTIME_ENV_FILE ?? '.env.local'));
const admin = dotenv.parse(fs.readFileSync(process.env.NEON_ADMIN_ENV_FILE ?? '.env.neon-admin.local'));
if (!runtime.NEON_BRANCH || runtime.NEON_BRANCH === 'production') throw new Error('Isolated Neon test branch required');
const args = process.argv.slice(2);
const env = { ...process.env, ...runtime,
  DATABASE_URL: admin.DATABASE_URL_UNPOOLED,
  DATABASE_URL_UNPOOLED: admin.DATABASE_URL_UNPOOLED,
  NEON_RUNTIME_DATABASE_URL: runtime.DATABASE_URL,
  NEON_ADMIN_DATABASE_URL: admin.DATABASE_URL_UNPOOLED,
};
// The browser suite signs test webhooks against the actual production handler.
// These throwaway credentials never call Stripe's network or enter production.
if (args.includes('playwright')) {
  env.STRIPE_SECRET_KEY = 'sk_test_neon_synthetic_not_for_network';
  env.STRIPE_WEBHOOK_SECRET = `whsec_${crypto.randomBytes(32).toString('hex')}`;
}
const child = spawn(args[0] ?? 'npm', args.slice(1), { env, stdio: 'inherit' });
child.on('exit', code => { process.exitCode = code ?? 1; });
