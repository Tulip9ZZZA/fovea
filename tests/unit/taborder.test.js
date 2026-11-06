import test from 'node:test';
import assert from 'node:assert/strict';
import { tabOrder, keyboardFocusSet } from '../../src/engine/taborder.js';

function snap(tag, attrs = {}, extra = {}) {
  return {
    tag, attrs,
    flags: { displayNone: false, visibilityHidden: false, hiddenAttr: false, disabled: false, svgTitle: false },
    rect: { x: 0, y: 0, w: 40, h: 20 },
    ...extra,
  };
}

test('links need href to be focusable', () => {
  const s = [snap('a', { href: '#' }), snap('a', {})];
  assert.deepEqual(tabOrder(s), [0]);
});

test('positive tabindex jumps the queue, ascending', () => {
  const s = [
    snap('a', { href: '#' }),                 // 0: doc order 1st
    snap('button', { tabindex: '3' }),        // 1
    snap('button', { tabindex: '1' }),        // 2
    snap('a', { href: '#' }),                 // 3: doc order 2nd
  ];
  assert.deepEqual(tabOrder(s), [2, 1, 0, 3]);
});

test('tabindex=-1 is removed from tab order', () => {
  const s = [snap('a', { href: '#' }), snap('button', { tabindex: '-1' })];
  assert.deepEqual(tabOrder(s), [0]);
});

test('hidden and disabled elements are skipped', () => {
  const s = [
    snap('a', { href: '#' }),
    snap('button', {}, { flags: { displayNone: true, visibilityHidden: false, hiddenAttr: false, disabled: false } }),
    snap('button', {}, { flags: { displayNone: false, visibilityHidden: true, hiddenAttr: false, disabled: false } }),
    snap('button', {}, { flags: { displayNone: false, visibilityHidden: false, hiddenAttr: true, disabled: false } }),
    snap('button', {}, { flags: { displayNone: false, visibilityHidden: false, hiddenAttr: false, disabled: true } }),
    snap('a', { href: '#' }),
  ];
  assert.deepEqual(tabOrder(s), [0, 5]);
});

test('input[type=hidden] is not focusable; zero tabindex stays in document order', () => {
  const s = [
    snap('input', { type: 'hidden' }),
    snap('input', { type: 'text', tabindex: '0' }),
    snap('select'),
  ];
  assert.deepEqual(tabOrder(s), [1, 2]);
});

test('contenteditable is focusable', () => {
  const s = [snap('div', { contenteditable: 'true' })];
  assert.deepEqual(tabOrder(s), [0]);
});

test('keyboardFocusSet matches tabOrder contents', () => {
  const s = [snap('a', { href: '#' }), snap('div'), snap('button', { tabindex: '-1' })];
  assert.deepEqual([...keyboardFocusSet(s)], [0]);
});
