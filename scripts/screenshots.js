// screenshots.js — the official submission screenshots (repo docs/ + submission set).
// Run with the app up: node scripts/screenshots.js
import { chromium } from '@playwright/test';
import fs from 'node:fs';

const OUT = process.argv[2] || '/home/z/my-project/fovea/docs';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });

// 1 — the money shot: X-ray on the demo shop
await page.goto('http://localhost:3000/workspace.html?demo=1');
await page.waitForFunction(() => window.__lastScanResult, null, { timeout: 20000 });
await page.waitForTimeout(1600); // stamp animations settle
await page.screenshot({ path: `${OUT}/screenshot-xray.png` });
console.log('1 xray done');

// 2 — live fix: fix the top 3 fixable rules, capture the moved score + fixed record
for (let i = 0; i < 3; i++) {
  const btn = page.locator('.vitem button[data-act="fix"]').first();
  if (await btn.count()) await btn.click();
  await page.waitForTimeout(700);
}
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/screenshot-livefix.png` });
console.log('2 livefix done');

// 3 — deuteranopia simulation
await page.reload();
await page.waitForFunction(() => window.__lastScanResult, null, { timeout: 20000 });
await page.selectOption('#simSelect', 'deuteranopia');
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/screenshot-simulation.png` });
console.log('3 simulation done');

// 4 — keyboard-only tab path
await page.selectOption('#simSelect', 'none');
await page.click('#btnTab');
await page.waitForTimeout(700);
await page.screenshot({ path: `${OUT}/screenshot-keyboard.png` });
console.log('4 keyboard done');

// 5 — corpus report with real data
await page.click('#btnTab');
await page.goto('http://localhost:3000/batch.html');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/screenshot-corpus.png`, fullPage: false });
console.log('5 corpus done');

await browser.close();
console.log('SCREENSHOTS OK →', OUT);
