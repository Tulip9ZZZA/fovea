// crawl.js — the Fovea batch pipeline: fetch → rewrite → render → analyze → aggregate.
// Drives the real app (workspace.html?url=…) in headless Chromium so the exact same
// engine, rules and scoring that users see run across the corpus. Results (violations,
// scores, metadata — not page copies) are written to data/corpus/.
// Usage: npm run crawl   (needs chromium: npx playwright install chromium)

import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../src/engine/rules.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'data', 'corpus');
const APP = process.env.FOVEA_URL || 'http://127.0.0.1:3000';
const CONCURRENCY = 4;
const PAGE_TIMEOUT = 45000;

const seeds = fs.readFileSync(path.join(OUT, 'seeds.txt'), 'utf8')
  .split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));

const ruleNames = Object.fromEntries(RULES.map(r => [r.id, r.title]));

async function auditOne(browser, url) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(`${APP}/workspace.html?url=${encodeURIComponent(url)}`, { timeout: PAGE_TIMEOUT });
    await page.waitForFunction(() => window.__lastScanResult, null, { timeout: PAGE_TIMEOUT });
    const r = await page.evaluate(() => {
      const s = window.__lastScanResult;
      const totals = {};
      for (const v of s.violations) totals[v.ruleId] = (totals[v.ruleId] || 0) + 1;
      return {
        url: s.meta.url, title: s.meta.title || '(untitled)',
        score: s.score.score, grade: s.score.grade,
        counts: s.score.counts, total: s.violations.length,
        topRule: s.score.topDrivers[0]?.ruleId || null,
        violationTotals: totals,
      };
    });
    return { ok: true, ...r, requestedUrl: url };
  } catch (e) {
    return { ok: false, requestedUrl: url, error: e.message.slice(0, 120) };
  } finally {
    await context.close();
  }
}

console.log(`Crawling ${seeds.length} seeds with concurrency ${CONCURRENCY} against ${APP}`);
const browser = await chromium.launch();
const pages = [];
const failures = [];
const queue = [...seeds];
const workers = Array.from({ length: CONCURRENCY }, async () => {
  while (queue.length) {
    const url = queue.shift();
    const res = await auditOne(browser, url);
    if (res.ok) {
      pages.push(res);
      console.log(`  ✓ ${res.score.toString().padStart(3)}  ${url}`);
    } else {
      failures.push(res);
      console.log(`  ✗ ---  ${url} (${res.error})`);
    }
  }
});
await Promise.all(workers);
await browser.close();

// aggregate violation totals across the corpus
const violationTotals = {};
for (const p of pages) {
  for (const [ruleId, n] of Object.entries(p.violationTotals || {})) {
    violationTotals[ruleId] = (violationTotals[ruleId] || 0) + n;
  }
}

const summary = {
  crawledAt: new Date().toISOString(),
  seedCount: seeds.length,
  okCount: pages.length,
  failCount: failures.length,
  violationTotals,
  ruleNames,
  failures: failures.map(f => ({ url: f.requestedUrl, reason: f.error })),
  pages: pages.map(({ violationTotals: _v, ...rest }) => rest),
  provenance:
    `${pages.length} of ${seeds.length} seed homepages audited successfully on ${summary_date()}. ` +
    'Pipeline: server-side fetch (same-origin proxy, scripts stripped) → headless Chromium render → ' +
    'Fovea engine (24 WCAG 2.2-aligned rules, Access Score) → aggregation. One homepage fetch per seed, ' +
    'standard crawler user-agent, no personal data collected; only per-page audit results are stored, not page copies. ' +
    'Failures (bot protection, timeouts, size caps) are listed and skipped.',
};
function summary_date() {
  return new Date().toISOString().slice(0, 10);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(summary, null, 1));
console.log(`\nWrote ${path.join(OUT, 'summary.json')}: ${pages.length} ok, ${failures.length} failed`);
