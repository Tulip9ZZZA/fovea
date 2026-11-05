// fixes.js — Live Fix Mode. Each entry applies the rule's suggested fix to the
// sandboxed copy in the iframe (in-memory only; the copy-paste snippet in the UI is
// the real deliverable for the actual codebase). Returns true if applied.

import { suggestTextColor } from './engine/rules.js';
import { parseColor } from './engine/color.js';

const FIXERS = {
  contrast(v, el, doc) {
    const fg = parseColor(el.style.color || getComputedStyle(el).color);
    const s = suggestTextColor(fg || [119, 119, 119], v.bg || [255, 255, 255, 1]);
    el.style.color = s;
    return true;
  },
  'img-no-alt'(v, el) { el.setAttribute('alt', 'Image — describe its content'); return true; },
  'img-link-no-name'(v, el) { el.setAttribute('aria-label', 'Link — describe the destination'); return true; },
  'input-no-label'(v, el) {
    const ph = el.getAttribute('placeholder');
    el.setAttribute('aria-label', ph ? `Field: ${ph}` : 'Form field — add a visible label');
    return true;
  },
  'button-no-name'(v, el) { el.setAttribute('aria-label', 'Button — add visible text'); return true; },
  'link-vague-text'(v, el) { el.setAttribute('aria-label', 'Describe where this link goes'); return true; },
  'heading-empty'(v, el) { el.remove(); return true; },
  'html-no-lang'(v, el, doc) { doc.documentElement.setAttribute('lang', 'en'); return true; },
  'title-missing'(v, el, doc) { doc.title = 'Untitled page — add a descriptive title'; return true; },
  'iframe-no-title'(v, el) { el.setAttribute('title', 'Embedded content — describe it'); return true; },
  'positive-tabindex'(v, el) { el.removeAttribute('tabindex'); return true; },
  'label-orphan'(v, el) { el.removeAttribute('for'); return true; },
  'duplicate-id'(v, el, doc, i) { el.setAttribute('id', `${el.id}-fixed-${i}`); return true; },
  'viewport-zoom'(v, el) { el.setAttribute('content', 'width=device-width, initial-scale=1'); return true; },
  'autocomplete-missing'(v, el) { el.setAttribute('autocomplete', 'email'); return true; },
  'table-no-header'(v, el) {
    const firstRow = el.querySelector('tr');
    if (!firstRow) return false;
    for (const td of firstRow.querySelectorAll('td')) {
      const th = doc.createElement('th');
      th.setAttribute('scope', 'col');
      th.textContent = td.textContent;
      for (const attr of td.attributes) th.setAttribute(attr.name, attr.value);
      td.replaceWith(th);
    }
    return true;
  },
  'target-blank'(v, el) {
    const t = el.textContent.trim();
    el.setAttribute('aria-label', `${t} (opens in a new tab)`);
    return true;
  },
  'obsolete-element'(v, el, doc) {
    const repl = doc.createElement(el.tagName === 'font' || el.tagName === 'center' ? 'div' : 'span');
    while (el.firstChild) repl.appendChild(el.firstChild);
    el.replaceWith(repl);
    return true;
  },
  'click-div'(v, el) {
    el.setAttribute('role', 'button');
    el.setAttribute('tabindex', '0');
    return true;
  },
  'aria-hidden-focus'(v, el) {
    el.setAttribute('tabindex', '-1');
    el.setAttribute('inert', '');
    return true;
  },
  'svg-no-name'(v, el) { el.setAttribute('aria-label', 'Graphic — describe it'); return true; },
  'heading-order'(v, el, doc) {
    const repl = doc.createElement(el.tagName === 'H4' ? 'h3' : 'h2');
    repl.innerHTML = el.innerHTML;
    for (const attr of el.attributes) repl.setAttribute(attr.name, attr.value);
    el.replaceWith(repl);
    return true;
  },
  'no-h1'() { return false; }, // content decision — needs a human, honestly not auto-fixable
};

export function canFix(ruleId) { return FIXERS.hasOwnProperty(ruleId); }

export function applyFix(ruleId, violation, doc, i) {
  const el = doc.querySelector ? doc.querySelector(violation.selector) : null;
  if (!el) return false;
  const fn = FIXERS[ruleId];
  try { return fn(violation, el, doc, i); } catch { return false; }
}

export function fixSnippet(ruleId, ruleFix, v) {
  return ruleFix ? ruleFix(v) : { summary: 'No automatic suggestion for this rule yet.', code: '' };
}
