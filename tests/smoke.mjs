// smoke.js — pipeline verification: drive the real UI, screenshot the money shots.
// Saved under scripts/ per persistence rules; run: node /home/z/my-project/scripts/smoke.js
import { chromium } from '@playwright/test';

const OUT = '/tmp/fovea-smoke';
import fs from 'node:fs';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. home
await page.goto('http://localhost:3000/');
await page.screenshot({ path: `${OUT}/1-home.png` });

// 2. workspace with demo shop, X-ray on
await page.goto('http://localhost:3000/workspace.html?demo=1');
await page.waitForFunction(() => window.__foveaReady, { timeout: 10000 });
await page.waitForFunction(() => window.__lastScanResult, { timeout: 15000 });
const score1 = await page.evaluate(() => window.__lastScanResult.score.score);
const viol1 = await page.evaluate(() => window.__lastScanResult.violations.length);
console.log(`demo shop scan: score=${score1}, violations=${viol1}`);
await page.waitForTimeout(1400); // let stamp animations finish
await page.screenshot({ path: `${OUT}/2-xray.png` });

// 3. simulation: deuteranopia
await page.selectOption('#simSelect', 'deuteranopia');
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/3-sim.png` });
await page.selectOption('#simSelect', 'none');

// 4. apply a contrast fix live → score should move
const before = score1;
await page.click('.vitem button[data-act="fix"]'); // first (highest-priority) fixable
await page.waitForTimeout(900);
const score2 = await page.evaluate(() => window.__lastScanResult.score.score);
console.log(`after live fix: score ${before} -> ${score2} (moved: ${score2 > before})`);
await page.screenshot({ path: `${OUT}/4-fix.png` });

// 5. keyboard-only mode
await page.click('#btnTab');
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/5-tab.png` });
await page.click('#btnTab');

// 6. transcript drawer
await page.click('#drawerHead');
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/6-transcript.png` });

// 7. proxy against a real site (example.com is the canonical light page)
await page.goto('http://localhost:3000/workspace.html?url=' + encodeURIComponent('https://example.com'));
await page.waitForFunction(() => window.__lastScanResult, { timeout: 25000 });
const ex = await page.evaluate(() => ({
  score: window.__lastScanResult.score.score,
  violations: window.__lastScanResult.violations.length,
  title: window.__lastScanResult.meta.title,
}));
console.log('proxy audit example.com:', JSON.stringify(ex));
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/7-proxy.png` });

// 8. batch page (corpus not crawled yet → friendly panel expected)
await page.goto('http://localhost:3000/batch.html');
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/8-batch.png` });

await browser.close();
console.log('SMOKE OK');
