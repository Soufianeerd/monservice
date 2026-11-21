import { defineConfig, devices } from '@playwright/test';

// Recette visuelle (scripts/neon/ci-branch.mjs, NEON_CI_RECETTE=true) :
// un compte réel par métier ouvert, chaque page du menu capturée.
export default defineConfig({
  testDir: './recette',
  timeout: 600_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'recette-output/rapport-playwright' }]],
  use: { actionTimeout: 20_000, navigationTimeout: 60_000, baseURL: 'http://localhost:3039', viewport: { width: 1440, height: 900 }, locale: 'fr-FR' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } } }],
  webServer: { command: 'npm run start -- --port 3039', url: 'http://localhost:3039', reuseExistingServer: false, timeout: 180_000 },
});
