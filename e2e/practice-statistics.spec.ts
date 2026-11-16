import { test, expect } from '@playwright/test';

// Statistiques du cabinet (paramédical) : page réservée au workspace
// paramédical, chiffres agrégés, changement de période.

async function login(page: import('@playwright/test').Page, email: string) {
  await page.context().clearCookies();
  await page.goto('/login');
  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', process.env.E2E_AUTH_PASSWORD!);
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => url.pathname === '/dashboard');
}

test('PRACTICE_STATS_01: a practitioner reads the practice statistics and changes the period', async ({ page }) => {
  await login(page, 'pro_health_a@monservice.invalid');
  await page.goto('/agenda/statistiques');
  const stats = page.locator('[data-testid="practice-statistics"]');
  await expect(stats.getByRole('heading', { name: 'Statistiques du cabinet' })).toBeVisible();
  for (const tile of ['stat-honored', 'stat-no-show-rate', 'stat-cancellation-rate', 'stat-upcoming', 'stat-active-patients', 'stat-new-patients']) {
    await expect(stats.locator(`[data-testid="${tile}"]`)).toBeVisible();
  }
  await expect(stats.locator('[data-testid="period-90d"]')).toHaveAttribute('aria-current', 'page');
  await expect(stats.locator('[data-testid="practice-activity-chart"]')).toBeVisible();

  await stats.locator('[data-testid="period-12m"]').click();
  await page.waitForURL((url) => url.searchParams.get('periode') === '12m');
  await expect(stats.locator('[data-testid="period-12m"]')).toHaveAttribute('aria-current', 'page');
  await expect(stats.locator('[data-testid="stat-honored"]')).toContainText(/\d/);
});

test('PRACTICE_STATS_02: the statistics stay closed to other workspaces', async ({ page }) => {
  await login(page, 'pro_fs_a@monservice.invalid');
  await page.goto('/agenda/statistiques');
  await page.waitForURL((url) => url.pathname === '/dashboard');
  await expect(page.locator('[data-testid="practice-statistics"]')).toHaveCount(0);
});
