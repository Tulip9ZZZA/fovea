import test from 'node:test';
import assert from 'node:assert/strict';
import { parseColor, composite, relativeLuminance, contrastRatio, effectiveBackground, requiredRatio, isLargeText } from '../../src/engine/color.js';

test('parseColor handles hex, rgba, named, and refuses advanced spaces', () => {
  assert.deepEqual(parseColor('#ff0000'), [255, 0, 0, 1]);
  assert.deepEqual(parseColor('#f00'), [255, 0, 0, 1]);
  assert.deepEqual(parseColor('rgb(10, 20, 30)'), [10, 20, 30, 1]);
  assert.deepEqual(parseColor('rgba(10, 20, 30, 0.5)'), [10, 20, 30, 0.5]);
  assert.deepEqual(parseColor('white'), [255, 255, 255, 1]);
  assert.deepEqual(parseColor('transparent'), [0, 0, 0, 0]);
  assert.equal(parseColor('oklch(0.5 0.1 20)'), null);
  assert.equal(parseColor('color(display-p3 1 0 0)'), null);
  assert.equal(parseColor('none'), null);
});

test('relative luminance bounds and midpoint', () => {
  assert.equal(relativeLuminance([0, 0, 0]), 0);
  assert.equal(relativeLuminance([255, 255, 255]), 1);
  assert.ok(relativeLuminance([128, 128, 128]) > 0.2 && relativeLuminance([128, 128, 128]) < 0.3);
});

test('contrast: black on white is exactly 21:1', () => {
  assert.equal(contrastRatio([0, 0, 0], [255, 255, 255]), 21);
});

test('contrast: the classic AA boundary grays (#767676 passes, #777777 fails)', () => {
  assert.ok(contrastRatio(parseColor('#767676'), parseColor('#ffffff')) >= 4.5);
  assert.ok(contrastRatio(parseColor('#777777'), parseColor('#ffffff')) < 4.5);
  assert.equal(contrastRatio(parseColor('#767676'), parseColor('#ffffff')).toFixed(2), '4.54');
});

test('composite does source-over blending', () => {
  assert.deepEqual(composite([255, 0, 0, 0.5], [255, 255, 255, 1]).slice(0, 3).map(Math.round), [255, 128, 128]);
  assert.equal(composite([0, 0, 0, 0.5], [0, 0, 0, 0.5])[3] < 1, true); // stacked translucency
});

test('effectiveBackground composites the ancestor chain until opaque', () => {
  const r = effectiveBackground([[0, 0, 0, 0.5], [255, 255, 255, 1]]);
  assert.equal(r.incomplete, false);
  assert.deepEqual(r.rgb.map(Math.round), [128, 128, 128]);
});

test('effectiveBackground reports incomplete when everything is transparent', () => {
  const r = effectiveBackground([[0, 0, 0, 0], [0, 0, 0, 0]]);
  assert.equal(r.incomplete, true);
});

test('effectiveBackground marks a chain that never turns opaque as incomplete', () => {
  const r = effectiveBackground([[255, 255, 255, 0.3]]);
  assert.equal(r.incomplete, true);
  assert.deepEqual(r.rgb, [255, 255, 255]); // raw color — premultiplying over nothing is meaningless
});

test('requiredRatio follows WCAG large-text thresholds', () => {
  assert.equal(requiredRatio(16, false, false), 4.5);
  assert.equal(requiredRatio(18, false, false), 4.5);
  assert.equal(requiredRatio(18.66, true, false), 3);
  assert.equal(requiredRatio(24, false, false), 3);
  assert.equal(isLargeText(24, false), true);
  assert.equal(isLargeText(19, true), true);
  assert.equal(isLargeText(18.5, true), false);
  assert.equal(isLargeText(18.5, false), false);
});
