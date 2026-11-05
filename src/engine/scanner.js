// scanner.js — the only DOM-touching part of the engine. Runs in the browser (app and
// Playwright crawler): walks the audited document once, producing pure snapshots that
// rules/taborder/readingorder/score consume. The element reference is attached to each
// snapshot as a NON-ENUMERABLE property so JSON.stringify(snapshot) stays clean.

import { parseColor } from './color.js';
import { runRules } from './rules.js';
import { computeScore } from './score.js';

const ATTRS = ['id', 'alt', 'aria-label', 'aria-labelledby', 'aria-hidden', 'role', 'title',
  'for', 'tabindex', 'href', 'type', 'autocomplete', 'content', 'target', 'lang',
  'disabled', 'placeholder', 'onclick', 'controls', 'contenteditable', 'scope', 'name'];

const MAX_SNAPSHOTS = 6000;
const MAX_TEXT = 300;

function collapse(s) {
  return s.replace(/\s+/g, ' ').trim();
}

function ownText(el) {
  let t = '';
  for (const n of el.childNodes) {
    if (n.nodeType === Node.TEXT_NODE) t += n.textContent + ' ';
  }
  return collapse(t).slice(0, MAX_TEXT);
}

function cssSelector(el) {
  if (el.id) return `#${CSS.escape(el.id)}`;
  const parts = [];
  let n = el;
  while (n && n.nodeType === 1 && parts.length < 4) {
    let seg = n.tagName.toLowerCase();
    if (n.id) { parts.unshift(`#${CSS.escape(n.id)}`); break; }
    const parent = n.parentElement;
    if (parent) {
      const same = Array.from(parent.children).filter(c => c.tagName === n.tagName);
      if (same.length > 1) seg += `:nth-of-type(${same.indexOf(n) + 1})`;
    }
    parts.unshift(seg);
    n = parent;
  }
  return parts.join(' > ');
}

function assocLabelText(el, doc) {
  if (el.id) {
    const l = doc.querySelector(`label[for="${CSS.escape(el.id)}"]`);
    if (l) return collapse(l.textContent).slice(0, MAX_TEXT);
  }
  const wrap = el.closest('label');
  if (wrap) return collapse(wrap.textContent).slice(0, MAX_TEXT);
  return '';
}

function depthOf(el) {
  let d = 0, n = el;
  while (n.parentElement) { d++; n = n.parentElement; }
  return d;
}

export function buildSnapshots(doc) {
  const els = Array.from(doc.querySelectorAll('*')).slice(0, MAX_SNAPSHOTS);
  const snapshots = [];
  for (const el of els) {
    const cs = doc.defaultView.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const bgImage = cs.backgroundImage;
    const attrs = {};
    for (const a of ATTRS) {
      const v = el.getAttribute(a);
      if (v !== null) attrs[a] = v;
    }
    const s = {
      tag: el.tagName.toLowerCase(),
      attrs,
      classes: Array.from(el.classList).slice(0, 5),
      text: ownText(el),
      subtreeText: collapse(el.textContent || '').slice(0, MAX_TEXT),
      rect: { x: Math.round(rect.x), y: Math.round(rect.y), w: Math.round(rect.width), h: Math.round(rect.height) },
      depth: depthOf(el),
      selector: cssSelector(el),
      assocLabel: assocLabelText(el, doc),
      inAriaHidden: !!el.closest('[aria-hidden="true"]'),
      flags: {
        displayNone: cs.display === 'none',
        visibilityHidden: cs.visibility === 'hidden' || cs.visibility === 'collapse',
        hiddenAttr: el.hasAttribute('hidden'),
        disabled: el.hasAttribute('disabled'),
        svgTitle: el.tagName.toLowerCase() === 'svg' && !!el.querySelector('title'),
      },
      computed: {
        color: cs.color,
        bgImage: bgImage === 'none' ? '' : bgImage.slice(0, 200),
        fontSize: parseFloat(cs.fontSize) || 16,
        fontWeight: parseFloat(cs.fontWeight) || 400,
        fontStyle: cs.fontStyle,
        opacity: parseFloat(cs.opacity),
        cursor: cs.cursor,
      },
    };
    // background chain: self first, then ancestors. undefined = bg image/gradient
    // present at that level (colors unknown) — rules treat that as "manual check".
    const chain = [];
    for (let n = el; n; n = n.parentElement) {
      const st = doc.defaultView.getComputedStyle(n);
      if (st.backgroundImage && st.backgroundImage !== 'none') { chain.push(undefined); break; }
      chain.push(parseColor(st.backgroundColor));
    }
    s.bgChain = chain;
    Object.defineProperty(s, 'el', { value: el, enumerable: false });
    snapshots.push(s);
  }
  return snapshots;
}

// Full audit of a document: snapshots → violations → score. Pure-in, JSON-out except
// the live element refs which stay on the snapshots for the UI.
export function scanDocument(doc, meta = {}) {
  const snapshots = buildSnapshots(doc);
  const violations = runRules(snapshots);
  const score = computeScore(violations);
  return {
    meta: {
      title: doc.title || '',
      lang: doc.documentElement?.getAttribute('lang') || '',
      ...meta,
    },
    scannedAt: new Date().toISOString(),
    snapshots,
    violations,
    score,
  };
}
