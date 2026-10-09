import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // Real EU Auth/Postgres calls and the complete intervention lifecycle span
  // multiple transactions. Keep every assertion, allow remote round trips.
  timeout: 120_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
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
