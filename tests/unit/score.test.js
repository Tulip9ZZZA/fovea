import test from 'node:test';
import assert from 'node:assert/strict';
import { computeScore, prioritize } from '../../src/engine/score.js';
import { SIMS } from '../../src/engine/sim.js';
import { readingTranscript } from '../../src/engine/readingorder.js';

const v = (ruleId, severity, tag = 'div', extra = {}) => ({
  ruleId, severity, title: ruleId, why: '', selector: tag, tag, snippet: '', rect: { x: 0, y: 0, w: 10, h: 10 }, ...extra,
});

test('clean page scores 100 / A+', () => {
  const s = computeScore([]);
  assert.equal(s.score, 100);
  assert.equal(s.grade, 'A+');
});

test('any violation breaks the perfect score (floor rounding)', () => {
  const s = computeScore([v('link-vague-text', 'minor', 'a')]);
  assert.equal(s.score, 99);
});

test('critical costs more than minor; pathological pages floor at 0', () => {
  const minor = computeScore([v('link-vague-text', 'minor', 'a')]).score;
  const crit = computeScore([v('button-no-name', 'critical', 'button')]).score;
  assert.ok(crit < minor);
  const disaster = computeScore(Array.from({ length: 25 }, (_, i) => v(`page-rule-${i}`, 'critical', 'html', { pageLevel: true })));
  assert.equal(disaster.score, 0);
});

test('page-level violations weigh double', () => {
  const page = computeScore([v('html-no-lang', 'serious', 'html', { pageLevel: true })]).score;
  const local = computeScore([v('img-no-alt', 'serious', 'img')]).score;
  assert.ok(page < local);
});

test('repeated violations of one rule diminish (gallery effect), different rules do not', () => {
  const repeat = computeScore(Array.from({ length: 10 }, () => v('img-no-alt', 'serious', 'img'))).score;
  const varied = computeScore(Array.from({ length: 10 }, (_, i) => v(`rule-${i}`, 'serious', 'img'))).score;
  assert.ok(repeat > varied, `repeat ${repeat} should beat varied ${varied}`);
});

test('topDrivers exist and prioritization puts heaviest first', () => {
  const vs = [
    v('link-vague-text', 'minor', 'a'),
    v('button-no-name', 'critical', 'button'),
    v('img-no-alt', 'serious', 'img'),
  ];
  const s = computeScore(vs);
  assert.equal(s.topDrivers.length, 3);
  const p = prioritize(vs);
  assert.equal(p[0].ruleId, 'button-no-name');
});

test('color-blindness matrices preserve white and grays', () => {
  for (const id of ['protanopia', 'deuteranopia', 'tritanopia']) {
    const m = SIMS[id].matrix;
    for (let row = 0; row < 3; row++) {
      const sum = m[row * 5] + m[row * 5 + 1] + m[row * 5 + 2];
      assert.ok(Math.abs(sum - 1) < 1e-4, `${id} row ${row} sums to ${sum}`);
    }
    const white = m.slice(0, 15).reduce((acc, w, i) => acc, null);
    // apply to (255,255,255): channel = sum of row * 255 → clamps to 255
    for (let row = 0; row < 3; row++) {
      const c = (m[row * 5] + m[row * 5 + 1] + m[row * 5 + 2]) * 255;
      assert.ok(c >= 254.9, `${id} keeps white white (got ${c})`);
    }
  }
});

test('reading transcript orders content and flags unlabeled images', () => {
  const lines = readingTranscript([
    { tag: 'h1', attrs: {}, text: 'Welcome', flags: { displayNone: false, visibilityHidden: false, hiddenAttr: false } },
    { tag: 'img', attrs: {}, text: '', flags: { displayNone: false, visibilityHidden: false, hiddenAttr: false } },
    { tag: 'img', attrs: { alt: 'A red bicycle' }, text: '', flags: { displayNone: false, visibilityHidden: false, hiddenAttr: false } },
    { tag: 'img', attrs: { alt: '' }, text: '', flags: { displayNone: false, visibilityHidden: false, hiddenAttr: false } },
    { tag: 'button', attrs: {}, text: 'Buy now', flags: { displayNone: false, visibilityHidden: false, hiddenAttr: false } },
  ]);
  assert.deepEqual(lines.map(l => l.kind), ['heading', 'image', 'image', 'button']);
  assert.match(lines[1].text, /no alt text/);
  assert.equal(lines[2].text, 'A red bicycle');
});
