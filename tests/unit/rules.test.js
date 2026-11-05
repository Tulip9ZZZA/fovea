import test from 'node:test';
import assert from 'node:assert/strict';
import { runRules, suggestTextColor } from '../../src/engine/rules.js';
import { parseColor, contrastRatio } from '../../src/engine/color.js';

function snap(over = {}) {
  return {
    tag: 'div', attrs: {}, classes: [], text: '', subtreeText: '',
    rect: { x: 0, y: 0, w: 100, h: 30 }, depth: 1, selector: 'div',
    assocLabel: '', inAriaHidden: false,
    flags: { displayNone: false, visibilityHidden: false, hiddenAttr: false, disabled: false, svgTitle: false },
    computed: { color: 'rgb(0, 0, 0)', bgImage: '', fontSize: 16, fontWeight: 400, fontStyle: 'normal', opacity: 1, cursor: 'auto' },
    bgChain: [[255, 255, 255, 1]],
    ...over,
  };
}

const ids = vs => vs.map(v => v.ruleId);

test('image without alt is flagged; alt="" or role=presentation is not', () => {
  const vs = runRules([snap({ tag: 'img', selector: 'img' })]);
  assert.ok(ids(vs).includes('img-no-alt'));
  const ok = runRules([
    snap({ tag: 'img', attrs: { alt: '' }, selector: 'img' }),
    snap({ tag: 'img', attrs: { role: 'presentation', alt: 'x' }, selector: 'img' }),
  ]);
  assert.equal(ids(ok).filter(r => r === 'img-no-alt').length, 0);
});

test('linked image with no name anywhere is critical', () => {
  const img = snap({ tag: 'img', depth: 2 });
  const a = snap({ tag: 'a', attrs: { href: '/x' }, depth: 1 });
  const vs = runRules([a, img]);
  assert.ok(ids(vs).includes('img-link-no-name'));
  const named = runRules([a, snap({ tag: 'img', attrs: { alt: 'Cart' }, depth: 2 })]);
  assert.equal(ids(named).includes('img-link-no-name'), false);
});

test('contrast rule: #777 on white fails, #767676 passes, gradient bg is skipped', () => {
  const fail = runRules([snap({
    tag: 'p', text: 'hello world', computed: { color: 'rgb(119, 119, 119)', bgImage: '', fontSize: 16, fontWeight: 400, fontStyle: 'normal', opacity: 1, cursor: 'auto' },
  })]);
  const cv = fail.find(v => v.ruleId === 'contrast');
  assert.ok(cv);
  assert.equal(cv.ratio, '4.48');
  assert.equal(cv.required, 4.5);
  const pass = runRules([snap({ tag: 'p', text: 'hello world', computed: { ...snap().computed, color: 'rgb(118, 118, 118)' } })]);
  assert.equal(pass.some(v => v.ruleId === 'contrast'), false);
  const grad = runRules([snap({
    tag: 'p', text: 'hello world',
    computed: { color: 'rgb(119, 119, 119)', bgImage: 'linear-gradient(rgb(0,0,0), rgb(9,9,9))', fontSize: 16, fontWeight: 400, fontStyle: 'normal', opacity: 1, cursor: 'auto' },
    bgChain: [undefined],
  })]);
  assert.equal(grad.some(v => v.ruleId === 'contrast'), false, 'gradient background must be a manual check, not a guess');
});

test('form field without any naming is critical; aria-label / label association fix it', () => {
  const bare = runRules([snap({ tag: 'input', attrs: { type: 'text' } })]);
  assert.ok(ids(bare).includes('input-no-label'));
  const labeled = runRules([
    snap({ tag: 'input', attrs: { type: 'text', id: 'e' }, assocLabel: 'Email' }),
  ]);
  assert.equal(ids(labeled).includes('input-no-label'), false);
  const aria = runRules([snap({ tag: 'input', attrs: { type: 'text', 'aria-label': 'Email' } })]);
  assert.equal(ids(aria).includes('input-no-label'), false);
  const submit = runRules([snap({ tag: 'input', attrs: { type: 'submit', value: 'Go' } })]);
  assert.equal(ids(submit).includes('input-no-label'), false);
});

test('empty button is flagged; button with text is not', () => {
  const bad = runRules([snap({ tag: 'button' })]);
  assert.ok(ids(bad).includes('button-no-name'));
  const good = runRules([snap({ tag: 'button', text: 'Buy', subtreeText: 'Buy' })]);
  assert.equal(ids(good).includes('button-no-name'), false);
});

test('vague link text', () => {
  const vs = runRules([snap({ tag: 'a', attrs: { href: '#' }, subtreeText: 'Click here' })]);
  assert.ok(ids(vs).includes('link-vague-text'));
});

test('heading order skips and empty headings', () => {
  const vs = runRules([
    snap({ tag: 'h2', text: 'A', subtreeText: 'A', depth: 1 }),
    snap({ tag: 'h4', text: 'B', subtreeText: 'B', depth: 1 }),
    snap({ tag: 'h5', text: '', depth: 1 }),
  ]);
  assert.ok(ids(vs).includes('heading-order'));
  assert.ok(ids(vs).includes('heading-empty'));
});

test('page-level: no lang, no title, no h1, zoom disabled', () => {
  const vs = runRules([
    snap({ tag: 'html', depth: 0 }),
    snap({ tag: 'head', depth: 1 }),
    snap({ tag: 'meta', attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1, user-scalable=no' }, depth: 2 }),
    snap({ tag: 'body', depth: 1 }),
  ]);
  for (const id of ['html-no-lang', 'title-missing', 'no-h1', 'viewport-zoom']) {
    assert.ok(ids(vs).includes(id), `${id} should fire`);
  }
});

test('duplicate ids reported once, on the first owner', () => {
  const vs = runRules([snap({ tag: 'div', attrs: { id: 'x' } }), snap({ tag: 'div', attrs: { id: 'x' } })]);
  const dups = vs.filter(v => v.ruleId === 'duplicate-id');
  assert.equal(dups.length, 1);
  assert.equal(dups[0].selector, 'div');
});

test('label orphan: for= pointing to a missing id', () => {
  const vs = runRules([snap({ tag: 'label', attrs: { for: 'nope' } }), snap({ tag: 'input', attrs: { type: 'text', id: 'real' } })]);
  assert.ok(ids(vs).includes('label-orphan'));
  const ok = runRules([snap({ tag: 'label', attrs: { for: 'real' } }), snap({ tag: 'input', attrs: { type: 'text', id: 'real' } })]);
  assert.equal(ids(ok).includes('label-orphan'), false);
});

test('clickable div without role/tabindex is serious; with role it is fine', () => {
  const bad = runRules([snap({ tag: 'div', computed: { ...snap().computed, cursor: 'pointer' } })]);
  assert.ok(ids(bad).includes('click-div'));
  const good = runRules([snap({ tag: 'div', attrs: { role: 'button', tabindex: '0' }, computed: { ...snap().computed, cursor: 'pointer' } })]);
  assert.equal(ids(good).includes('click-div'), false);
});

test('focusable inside aria-hidden', () => {
  const vs = runRules([snap({ tag: 'button', subtreeText: 'x', text: 'x', inAriaHidden: true })]);
  assert.ok(ids(vs).includes('aria-hidden-focus'));
});

test('data table without th; th inside the right table clears it', () => {
  const table = snap({ tag: 'table', depth: 1 });
  const row = snap({ tag: 'tr', depth: 2 });
  const cell = snap({ tag: 'td', depth: 3 });
  const noTh = runRules([table, row, cell]);
  assert.ok(ids(noTh).includes('table-no-header'));
  const th = snap({ tag: 'th', depth: 3 });
  const withTh = runRules([snap({ tag: 'table', depth: 1 }), row, th]);
  assert.equal(ids(withTh).includes('table-no-header'), false);
});

test('email field without autocomplete; with autocomplete passes', () => {
  const vs = runRules([snap({ tag: 'input', attrs: { type: 'email' } })]);
  assert.ok(ids(vs).includes('autocomplete-missing'));
  const ok = runRules([snap({ tag: 'input', attrs: { type: 'email', autocomplete: 'email' } })]);
  assert.equal(ids(ok).includes('autocomplete-missing'), false);
});

test('suggestTextColor always reaches the required ratio', () => {
  for (const [fg, bg] of [
    [[119, 119, 119], [255, 255, 255]],
    [[190, 190, 255], [230, 230, 255]],
    [[60, 60, 60], [20, 20, 20]],
  ]) {
    const s = suggestTextColor(fg, bg);
    const parsed = parseColor(s);
    assert.ok(parsed, `suggestion ${s} should parse`);
    assert.ok(contrastRatio(parsed, bg) >= 4.5, `suggestion ${s} should pass on bg ${bg}`);
  }
});
