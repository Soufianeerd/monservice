import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Verification-required recovery runs separately on a disposable branch.
  testIgnore: process.env.E2E_V1_SCOPE === 'true'
    ? undefined
    : process.env.E2E_STRICT_AUTH === 'true'
      ? '**/v1-professional-only.spec.ts'
      : ['**/auth-recovery.spec.ts', '**/v1-professional-only.spec.ts'],
  // V1 scope (client spaces closed, as in production) runs as its own pass.
  testMatch: process.env.E2E_V1_SCOPE === 'true' ? '**/v1-professional-only.spec.ts' : undefined,
  // Real EU Auth/Postgres calls and the complete intervention lifecycle span
  // multiple transactions. Keep every assertion, allow remote round trips.
  // Les parcours complets (invitation portail, cycle d'intervention, équipe)
  // prenaient déjà 1,9 à 2,0 min sur une CI verte : 120 s ne laissait aucune marge.
  timeout: 240_000,
  // Each assertion may wait on several Auth/Postgres round trips to Frankfurt
  // (GitHub runners are not in the EU). Assertions themselves are unchanged.
  expect: { timeout: 20_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // In CI, failures become GitHub annotations (file, line, message) and the log
  // lists every test; the HTML report is uploaded as an artifact.
  reporter: process.env.CI ? [['github'], ['list'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3039',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: process.env.E2E_PRODUCTION_BUILD === 'true' ? 'npm run start -- --port 3039' : 'npm run dev -- --port 3039',
    url: process.env.E2E_BASE_URL ?? 'http://localhost:3039',
    reuseExistingServer: process.env.E2E_REUSE_SERVER === 'true',
  },
});
