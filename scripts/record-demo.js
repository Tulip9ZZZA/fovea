// record-demo.js — records the raw demo tape per docs/demo-script.md.
// Discover/rehearse/record: run `node scripts/record-demo.js --rehearse` (no video,
// prints beat timings), then `node scripts/record-demo.js` for the take.
// Output: /tmp/fovea-demo/demo.webm → converted to demo_raw.mp4 by convert-demo.sh.

import { chromium } from '@playwright/test';
import fs from 'node:fs';

const REHEARSE = process.argv.includes('--rehearse');
const OUT = '/tmp/fovea-demo';
const BASE = 'http://localhost:3000';
if (!REHEARSE) fs.mkdirSync(OUT, { recursive: true });

// beat durations (ms) — authoritative timings (docs/demo-script.md)
const B = {
  b1: 11000, b2: 10000, b3: 22000, b4: 26000, b5: 10000,
  b6: 22000, b7: 12000, b8: 6000, b9: 34000, b10: 14000,
};
const TOTAL = Object.values(B).reduce((a, b) => a + b, 0);
const CUM = Object.values(B).reduce((acc, v) => { acc.push((acc[acc.length - 1] || 0) + v); return acc; }, []);
const BEAT_END = {}; Object.keys(B).forEach((k, i) => { BEAT_END[k] = CUM[i]; });

const sleep = ms => new Promise(r => setTimeout(r, ms));

// gentle cursor drift so holds never feel dead; holdUntil lands each moment on its mark
let T0 = 0;
let page_mouse = null; // bound in main()
async function holdUntil(absMs) {
  let i = 0;
  while (Date.now() < T0 + absMs - 700) {
    const x = 960 + Math.sin(i / 2.2) * 260;
    const y = 540 + Math.cos(i / 3.1) * 130;
    await page_mouse.move(x, y, { steps: 18 });
    await sleep(420);
    i += 1;
  }
}

async function fixRule(page, title) {
  const item = page.locator('.vitem', { hasText: title }).first();
  await item.scrollIntoViewIfNeeded();
  await item.hover();
  await sleep(500);
  const btn = item.locator('button[data-act="fix"]');
  await btn.click();
  await page.waitForTimeout(1400); // re-scan + score animation
}

async function locateRule(page, title) {
  const item = page.locator('.vitem', { hasText: title }).first();
  await item.scrollIntoViewIfNeeded();
  await item.locator('button[data-act="locate"]').click();
  await page.waitForTimeout(1200);
}

async function main() {
  const ctxOpts = {
    viewport: { width: 1920, height: 1080 },
  };
  if (!REHEARSE) ctxOpts.recordVideo = { dir: OUT, size: { width: 1920, height: 1080 } };
  const browser = await chromium.launch();
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  // visible cursor overlay
  await page.addInitScript(() => {
    const cur = document.createElement('div');
    cur.style.cssText = 'position:fixed;z-index:999999;width:22px;height:22px;border-radius:50%;' +
      'background:rgba(14,122,77,.30);border:2.5px solid #0e7a4d;pointer-events:none;' +
      'left:-40px;top:-40px;transition:left .05s linear, top .05s linear;';
    document.addEventListener('mousemove', e => { cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px'; });
    document.addEventListener('mousedown', () => { cur.style.background = 'rgba(214,69,69,.45)'; });
    document.addEventListener('mouseup', () => { cur.style.background = 'rgba(14,122,77,.30)'; });
    (document.body || document.documentElement).appendChild(cur);
  });

  const t0 = Date.now();
  T0 = t0;
  page_mouse = page.mouse;
  const log = m => console.log(`[${((Date.now() - t0) / 1000).toFixed(1)}s] ${m}`);

  // ---- beat 1: home → demo shop (11s)
  await page.goto(BASE + '/');
  await page.waitForTimeout(2400);
  await page.hover('#demo');
  await sleep(500);
  await page.click('#demo');
  await page.waitForFunction(() => window.__lastScanResult, null, { timeout: 20000 });
  await page.waitForTimeout(2200);
  await holdUntil(11000);
  log('b1 home→workspace done');

  // ---- beat 2: X-ray (10s)
  await page.click('#btnXray');
  await page.waitForTimeout(2600); // stamps + score animation
  await holdUntil(21000);
  log('b2 xray done');

  // ---- beat 3: walk the stamps (22s)
  await locateRule(page, 'Form field has no label');
  await locateRule(page, 'Button has no accessible name');
  await locateRule(page, 'Link opens a new window without warning');
  await locateRule(page, 'Clickable element not keyboard reachable');
  await locateRule(page, 'Focusable element inside aria-hidden');
  await holdUntil(43000);
  log('b3 walk done');

  // ---- beat 4: simulations (43s → 69s)
  await page.selectOption('#simSelect', 'protanopia');
  await page.waitForTimeout(1400);
  await holdUntil(51000);
  await page.selectOption('#simSelect', 'lowvision');
  await page.waitForTimeout(1400);
  await holdUntil(59000);
  await page.selectOption('#simSelect', 'none');
  await page.click('#btnTab');
  await page.waitForTimeout(1800);
  await holdUntil(69000);
  log('b4 simulations done');

  // ---- beat 5: score popover (69s → 79s)
  await page.click('#btnTab'); // back to x-ray view
  await page.selectOption('#simSelect', 'none');
  await page.click('#btnScoreInfo');
  await page.waitForTimeout(2600);
  await page.click('#scoreInfo .box button');
  await page.waitForTimeout(600);
  await holdUntil(79000);
  log('b5 popover done');

  // ---- beat 6: debian.org through the proxy (79s → 101s)
  await page.fill('#url', 'https://www.debian.org');
  await page.waitForTimeout(2200); // typing time
  await page.click('#urlForm button[type="submit"]');
  await page.waitForFunction(
    () => window.__lastScanResult && window.__lastScanResult.meta.url.replace(/\/$/, '') === 'https://www.debian.org',
    null, { timeout: 30000 },
  );
  await page.waitForTimeout(2500);
  await holdUntil(101000);
  log('b6 proxy audit done');

  // ---- beat 7: walk the real result (101s → 113s)
  await page.mouse.move(700, 500);
  await page.mouse.wheel(0, 700);
  await page.waitForTimeout(1200);
  await page.hover('#sourceBadge');
  await page.waitForTimeout(1500);
  await holdUntil(113000);
  log('b7 walk real site done');

  // ---- beat 8: fresh demo session (113s → 119s)
  await page.click('a[href="/"]');
  await page.waitForLoadState('load');
  await page.click('#demo');
  await page.waitForFunction(() => window.__lastScanResult, null, { timeout: 20000 });
  await page.waitForTimeout(1500);
  await holdUntil(119000);
  log('b8 reset done');

  // ---- beat 9: live fixes, content level (119s → 153s)
  await fixRule(page, 'Form field has no label');
  await fixRule(page, 'Button has no accessible name');
  await fixRule(page, 'Linked image has no accessible name');
  await fixRule(page, 'Text contrast below WCAG AA');
  await fixRule(page, 'Focusable element inside aria-hidden');
  await fixRule(page, 'Image has no alt attribute');
  await fixRule(page, 'Clickable element not keyboard reachable');
  const s1 = await page.evaluate(() => window.__lastScanResult.score.score);
  log(`b9 fixes done, score=${s1}`);
  await holdUntil(153000);

  // ---- beat 10: page-level fixes + close (153s → 167s)
  await fixRule(page, 'Page language not declared');
  await fixRule(page, 'Page has no <title');
  await fixRule(page, 'Pinch-to-zoom disabled');
  await fixRule(page, 'Data table without header cells');
  await fixRule(page, 'Iframe has no title');
  const s2 = await page.evaluate(() => window.__lastScanResult.score.score);
  log(`b10 page fixes done, score=${s2}`);
  await holdUntil(167000);

  const total = (Date.now() - t0) / 1000;
  log(`TOTAL ${total.toFixed(1)}s (target ${TOTAL / 1000}s)`);
  if (total < 150 || total > 180) console.log('WARNING: tape length outside 150-180s — tune beat constants!');

  await context.close(); // flushes video
  await browser.close();
  console.log('RECORD OK');
}

main().catch(e => { console.error('RECORD FAILED:', e); process.exit(1); });
