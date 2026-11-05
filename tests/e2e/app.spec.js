import { test, expect } from '@playwright/test';

test.describe('home', () => {
  test('hooks with the problem statement and offers the demo shop', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Most websites are broken');
    await expect(page.locator('#demo')).toBeVisible();
    await expect(page.locator('#go')).toBeVisible();
  });

  test('demo button leads to the workspace', async ({ page }) => {
    await page.goto('/');
    await page.click('#demo');
    await expect(page).toHaveURL(/workspace\.html\?demo=1/);
  });
});

test.describe('workspace', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workspace.html?demo=1');
    await page.waitForFunction(() => window.__lastScanResult, null, { timeout: 20000 });
  });

  test('scans the demo shop and produces a mid-range score with violations', async ({ page }) => {
    const s = await page.evaluate(() => window.__lastScanResult.score);
    expect(s.score).toBeGreaterThanOrEqual(40);
    expect(s.score).toBeLessThanOrEqual(80);
    expect(s.total).toBeGreaterThan(15);
    expect(s.counts.critical).toBeGreaterThan(0);
  });

  test('X-ray pins violation chips over the page', async ({ page }) => {
    await page.waitForTimeout(800);
    const chips = await page.locator('#overlay .vchip').count();
    expect(chips).toBeGreaterThan(10);
    // chips carry readable labels
    await expect(page.locator('#overlay .vchip .tag').first()).toBeVisible();
  });

  test('color-blindness simulation changes the stage filter', async ({ page }) => {
    await page.selectOption('#simSelect', 'deuteranopia');
    const filter = await page.locator('#stage').evaluate(el => el.style.filter);
    expect(filter).toContain('fovea-sim-deuteranopia');
  });

  test('keyboard-only mode shows a numbered tab path', async ({ page }) => {
    await page.click('#btnTab');
    await page.waitForTimeout(400);
    const chips = await page.locator('#overlay .kchip').count();
    expect(chips).toBeGreaterThan(5);
    await expect(page.locator('#overlay .kchip').first()).toHaveText('1');
  });

  test('screen-reader transcript drawer opens with content', async ({ page }) => {
    await page.click('#drawerHead');
    const lines = await page.locator('#transcriptBody .ln').count();
    expect(lines).toBeGreaterThan(5);
  });

  test('live fix mode raises the score and marks rules fixed', async ({ page }) => {
    const before = await page.evaluate(() => window.__lastScanResult.score.score);
    await page.locator('.vitem button[data-act="fix"]').first().click();
    await page.waitForFunction(
      prev => window.__lastScanResult && window.__lastScanResult.score.score > prev,
      before,
      { timeout: 10000 },
    );
    const after = await page.evaluate(() => window.__lastScanResult.score.score);
    expect(after).toBeGreaterThan(before);
    await expect(page.locator('.fixedbadge').first()).toBeVisible();
  });
});

test.describe('batch page', () => {
  test('renders a friendly state when no corpus exists, data when it does', async ({ page }) => {
    await page.goto('/batch.html');
    await page.waitForTimeout(700);
    const hasPanel = await page.locator('.panel').count();
    expect(hasPanel).toBeGreaterThan(0);
  });
});
