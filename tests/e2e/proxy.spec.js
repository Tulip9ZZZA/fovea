import { test, expect } from '@playwright/test';

test.describe('same-origin proxy', () => {
  test('mirrors a real page with scripts stripped', async ({ request }) => {
    const res = await request.get('/proxy?url=' + encodeURIComponent('https://example.com'));
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain('Example Domain');
    expect(body).not.toMatch(/<script/i);
    expect(res.headers()['x-fovea-proxy']).toBe('1');
  });

  test('refuses private and loopback addresses (SSRF guard)', async ({ request }) => {
    for (const url of ['http://127.0.0.1:3000/api/health', 'http://10.0.0.1/', 'http://192.168.1.1/']) {
      const res = await request.get('/proxy?url=' + encodeURIComponent(url));
      expect(res.status()).toBe(403);
    }
  });

  test('rejects garbage and non-http schemes', async ({ request }) => {
    expect((await request.get('/proxy?url=not-a-url')).status()).toBe(400);
    expect((await request.get('/proxy?url=' + encodeURIComponent('ftp://x'))).status()).toBe(400);
  });

  test('workspace audits a real site through the proxy', async ({ page }) => {
    await page.goto('/workspace.html?url=' + encodeURIComponent('https://example.com'));
    await page.waitForFunction(() => window.__lastScanResult, null, { timeout: 30000 });
    const r = await page.evaluate(() => ({
      title: window.__lastScanResult.meta.title,
      violations: window.__lastScanResult.violations.length,
    }));
    expect(r.title).toContain('Example Domain');
    expect(r.violations).toBeGreaterThanOrEqual(1);
    await expect(page.locator('#sourceBadge')).toContainText('same-origin proxy');
  });
});
