// rules.js — Fovea's WCAG 2.2-aligned rule set.
// Each rule inspects pure element snapshots (see scanner.js) and returns a violation
// or null. No rule touches a DOM — that keeps the engine unit-testable in Node and
// re-runnable by the batch crawler. `check` uses method shorthand so `this` is the rule.
// Severity scale: critical > serious > moderate > minor.

import { parseColor, contrastRatio, formatRatio, effectiveBackground, requiredRatio, relativeLuminance } from './color.js';

const VAGUE_LINK_TEXT = new Set(['click here', 'here', 'more', 'read more', 'learn more', 'this link', 'link', 'details', 'continue', 'go']);

function violation(rule, snap, extra) {
  return {
    ruleId: rule.id, wcag: rule.wcag, severity: rule.severity,
    title: rule.title, why: rule.why,
    selector: snap.selector, tag: snap.tag, elIndex: snap.i,
    snippet: (snap.text || snap.attrs.alt || '').slice(0, 80),
    rect: snap.rect,
    ...extra,
  };
}

const hasText = s => (s.text || '').trim().length > 0;
const FOCUSABLE_TAGS = ['a', 'button', 'input', 'select', 'textarea', 'iframe', 'summary'];

export const RULES = [
  {
    id: 'img-no-alt', wcag: '1.1.1', severity: 'serious',
    title: 'Image has no alt attribute',
    why: 'A screen reader reads the file name out loud, or skips the image entirely, so the information it carries is lost.',
    check(s, ctx) {
      if (s.tag !== 'img' || s.attrs.alt !== undefined) return null;
      if (s.attrs.role === 'presentation' || s.attrs.role === 'none') return null;
      return violation(this, s, {});
    },
    fix: () => ({ summary: 'Describe what the image shows (or alt="" if purely decorative).', code: '<img src="…" alt="Customer opening a delivery box">' }),
  },
  {
    id: 'img-link-no-name', wcag: '1.1.1 / 2.4.4', severity: 'critical',
    title: 'Linked image has no accessible name',
    why: 'The link is announced as just "link" with no destination — it is unusable non-visually.',
    check(s, ctx) {
      if (s.tag !== 'img') return null;
      if (s.attrs.alt !== undefined && s.attrs.alt !== '') return null;
      const p = s.parents.find(t => t.tag === 'a');
      if (!p) return null;
      const a = ctx.snapshots[p.index];
      if ((a.subtreeText || '').trim() || a.attrs['aria-label']) return null;
      return violation(this, a, {});
    },
    fix: () => ({ summary: 'Give the link a name: alt text on the image or aria-label on the link.', code: '<a href="/sales"><img src="…" alt="Summer sale — 50% off everything"></a>' }),
  },
  {
    id: 'contrast', wcag: '1.4.3', severity: 'serious',
    title: 'Text contrast below WCAG AA',
    why: 'Low-contrast text is unreadable for users with low vision or on cheap screens in sunlight.',
    check(s, ctx) {
      if (!hasText(s) || s.flags.displayNone || s.flags.visibilityHidden) return null;
      if (s.computed.opacity !== undefined && s.computed.opacity < 0.1) return null;
      if (s.bgChain.some(c => c === undefined)) return null; // gradient/image behind text → manual check
      const fg = parseColor(s.computed.color);
      if (!fg) return null;                                  // advanced color space → out of scope
      const bgRes = effectiveBackground(s.bgChain);
      if (bgRes.incomplete) return null;                     // unknown page background → honest skip
      const isBold = s.computed.fontWeight >= 700;
      const need = requiredRatio(s.computed.fontSize, isBold, false);
      const ratio = contrastRatio(fg, bgRes.rgb);
      if (ratio >= need) return null;
      return violation(this, s, { ratio: formatRatio(ratio), required: need, fg, bg: bgRes.rgb });
    },
    fix: v => ({
      summary: `Raise contrast from ${v.ratio}:1 to at least ${v.required}:1.`,
      code: `/* suggested (verify visually) */ color: ${suggestTextColor(v.fg, v.bg)};`,
    }),
  },
  {
    id: 'input-no-label', wcag: '1.3.1 / 4.1.2', severity: 'critical',
    title: 'Form field has no label',
    why: 'Without a programmatic label, a screen reader announces "edit text" with no hint of what to type.',
    check(s, ctx) {
      if (!['input', 'textarea', 'select'].includes(s.tag)) return null;
      if (s.flags.disabled) return null;
      if (s.tag === 'input' && ['hidden', 'submit', 'button', 'reset', 'image'].includes(s.attrs.type)) return null;
      if (s.assocLabel || s.attrs['aria-label'] || s.attrs['aria-labelledby'] || s.attrs.title) return null;
      return violation(this, s, {});
    },
    fix: () => ({ summary: 'Associate a <label for=…>, or add aria-label if the design shows no visible label.', code: '<label for="email">Email address</label>\n<input id="email" type="email">' }),
  },
  {
    id: 'button-no-name', wcag: '4.1.2', severity: 'critical',
    title: 'Button has no accessible name',
    why: 'A button announced as "button, button" cannot be identified or operated non-visually.',
    check(s, ctx) {
      if (s.tag !== 'button') return null; // input[type=submit/button] gets its name from value
      if ((s.subtreeText || '').trim() || s.attrs['aria-label'] || s.attrs.title || s.attrs['aria-labelledby']) return null;
      return violation(this, s, {});
    },
    fix: () => ({ summary: 'Add visible text, or an aria-label for icon-only buttons.', code: '<button aria-label="Close dialog">✕</button>' }),
  },
  {
    id: 'link-vague-text', wcag: '2.4.4', severity: 'minor',
    title: 'Vague link text',
    why: 'Screen-reader users navigate by a list of link names — "click here" gives no information.',
    check(s, ctx) {
      if (s.tag !== 'a' || s.attrs.href === undefined) return null;
      const t = ((s.subtreeText || s.text) || '').trim().toLowerCase();
      if (!t || !VAGUE_LINK_TEXT.has(t)) return null;
      return violation(this, s, {});
    },
    fix: () => ({ summary: 'Say where the link goes, from inside the link itself.', code: '<a href="/reports">Read the 2026 impact report</a>' }),
  },
  {
    id: 'heading-order', wcag: '1.3.1', severity: 'minor',
    title: 'Heading level skipped',
    why: 'Heading levels map the page outline; jumping h2 → h4 makes navigation by headings confusing.',
    check(s, ctx) {
      const m = /^h([1-6])$/.exec(s.tag);
      if (!m || !hasText(s)) return null;
      const lvl = Number(m[1]);
      if (ctx.lastHeading !== null && lvl > ctx.lastHeading + 1) return violation(this, s, {});
      return null;
    },
    fix: () => ({ summary: 'Use the next level down (or restructure the outline); style with CSS, not level jumps.', code: '<!-- replace <h4> with -->\n<h3>…</h3>' }),
  },
  {
    id: 'no-h1', wcag: '2.4.6', severity: 'minor',
    title: 'Page has no main heading (h1)',
    why: 'The h1 is usually the first thing a screen-reader user asks for when orienting on a new page.',
    check(s, ctx) {
      if (ctx.hasH1 || s.tag !== 'body') return null;
      return violation(this, s, { pageLevel: true });
    },
    fix: () => ({ summary: 'Add exactly one h1 naming the page.', code: '<h1>NovaMart — weekly grocery deals</h1>' }),
  },
  {
    id: 'heading-empty', wcag: '1.3.1', severity: 'minor',
    title: 'Empty heading',
    why: 'An empty heading is announced as a level with no text — usually markup misused for styling.',
    check(s, ctx) {
      if (!/^h[1-6]$/.test(s.tag)) return null;
      return hasText(s) ? null : violation(this, s, {});
    },
    fix: () => ({ summary: 'Remove the heading or give it real text; use a styled <div> for decoration.', code: '<div class="decoration">…</div>' }),
  },
  {
    id: 'html-no-lang', wcag: '3.1.1', severity: 'serious',
    title: 'Page language not declared',
    why: 'Screen readers pick a pronunciation engine from <html lang>; without it, content can be read in the wrong voice and language.',
    check(s, ctx) {
      return (s.tag === 'html' && !s.attrs.lang) ? violation(this, s, { pageLevel: true }) : null;
    },
    fix: () => ({ summary: 'Declare the human language of the content.', code: '<html lang="en">' }),
  },
  {
    id: 'title-missing', wcag: '2.4.2', severity: 'serious',
    title: 'Page has no <title>',
    why: 'The title names the page in browser tabs, history, search results and screen-reader page navigation.',
    check(s, ctx) {
      return (s.tag === 'head' && !ctx.hasTitle) ? violation(this, s, { pageLevel: true }) : null;
    },
    fix: () => ({ summary: 'Add a descriptive unique title.', code: '<title>Checkout — NovaMart</title>' }),
  },
  {
    id: 'iframe-no-title', wcag: '4.1.2', severity: 'moderate',
    title: 'Iframe has no title',
    why: 'A screen reader announces the frame by URL; a title says what it contains before users enter it.',
    check(s, ctx) {
      return (s.tag === 'iframe' && !s.attrs.title) ? violation(this, s, {}) : null;
    },
    fix: () => ({ summary: 'Describe the embedded content.', code: '<iframe src="…" title="Store opening hours map"></iframe>' }),
  },
  {
    id: 'positive-tabindex', wcag: '4.1.2', severity: 'minor',
    title: 'Positive tabindex overrides natural order',
    why: 'tabindex greater than 0 jumps the queue globally, producing focus orders that contradict the visual layout.',
    check(s, ctx) {
      const n = parseInt(s.attrs.tabindex ?? '', 10);
      return (Number.isInteger(n) && n > 1) ? violation(this, s, {}) : null;
    },
    fix: () => ({ summary: 'Remove positive tabindex and fix DOM order instead (tabindex="0" is fine for custom widgets).', code: '<!-- remove tabindex="3" from this element -->' }),
  },
  {
    id: 'label-orphan', wcag: '1.3.1', severity: 'minor',
    title: 'Label points to nothing',
    why: 'A <label for=…> whose target id does not exist labels nothing; the field stays unnamed.',
    check(s, ctx) {
      if (s.tag !== 'label' || !s.attrs.for) return null;
      return ctx.byId.has(s.attrs.for) ? null : violation(this, s, {});
    },
    fix: () => ({ summary: 'Point for= at the real input id (or nest the input inside the label).', code: '<label for="zip">ZIP code</label><input id="zip">' }),
  },
  {
    id: 'duplicate-id', wcag: '4.1.1', severity: 'moderate',
    title: 'Duplicate id',
    why: 'aria-labelledby, label for= and URL fragments resolve to only one element when ids are duplicated.',
    check(s, ctx) {
      const id = s.attrs.id;
      return (id && ctx.dupeIds.has(id) && ctx.firstIdOwner.get(id) === s.i) ? violation(this, s, {}) : null;
    },
    fix: () => ({ summary: 'Make ids unique; use classes for styling.', code: '<!-- id="card" → id="card-1", id="card-2" -->' }),
  },
  {
    id: 'viewport-zoom', wcag: '1.4.4', severity: 'serious',
    title: 'Pinch-to-zoom disabled',
    why: 'user-scalable=no / maximum-scale<2 blocks users with low vision from zooming — a direct accessibility lock-out.',
    check(s, ctx) {
      if (s.tag !== 'meta' || s.attrs.name !== 'viewport') return null;
      const c = s.attrs.content || '';
      if (/user-scalable\s*=\s*no/i.test(c) || /maximum-scale\s*=\s*([01](\.\d+)?)\b/i.test(c)) {
        return violation(this, s, { pageLevel: true });
      }
      return null;
    },
    fix: () => ({ summary: 'Allow zooming.', code: '<meta name="viewport" content="width=device-width, initial-scale=1">' }),
  },
  {
    id: 'autocomplete-missing', wcag: '1.3.5', severity: 'moderate',
    title: 'Email field without autocomplete',
    why: 'autocomplete="email" lets browsers and assistive tech fill the field correctly — critical for motor-impaired users.',
    check(s, ctx) {
      return (s.tag === 'input' && s.attrs.type === 'email' && !s.attrs.autocomplete) ? violation(this, s, {}) : null;
    },
    fix: () => ({ summary: 'Add the standard autocomplete token.', code: '<input type="email" autocomplete="email">' }),
  },
  {
    id: 'table-no-header', wcag: '1.3.1', severity: 'moderate',
    title: 'Data table without header cells',
    why: 'Without <th> (or role="columnheader") a screen reader reads rows as loose numbers with no column meaning.',
    check(s, ctx) {
      if (s.tag !== 'table' || s.attrs.role === 'presentation' || s.attrs.role === 'none') return null;
      return ctx.tablesWithTh.has(s.i) ? null : violation(this, s, {});
    },
    fix: () => ({ summary: 'Turn the first row/column into real <th scope=…> cells.', code: '<tr><th scope="col">Product</th>…' }),
  },
  {
    id: 'target-blank', wcag: '3.2.5', severity: 'minor',
    title: 'Link opens a new window without warning',
    why: 'Unexpected context switches disorient screen-reader and low-vision users; the behavior should be announced.',
    check(s, ctx) {
      if (s.tag !== 'a' || s.attrs.target !== '_blank') return null;
      const t = `${s.subtreeText || ''} ${s.attrs['aria-label'] || ''} ${s.attrs.title || ''}`.toLowerCase();
      return /(new (window|tab)|external)/.test(t) ? null : violation(this, s, {});
    },
    fix: () => ({ summary: 'Warn in the accessible name (and consider not using target=_blank at all).', code: '<a href="…" target="_blank">Terms (opens in a new tab)</a>' }),
  },
  {
    id: 'obsolete-element', wcag: 'best practice', severity: 'minor',
    title: 'Obsolete element',
    why: '<marquee>, <blink>, <font>, <center> are deprecated, inconsistently announced, and ignore user styles.',
    check(s, ctx) {
      return ['marquee', 'blink', 'font', 'center'].includes(s.tag) ? violation(this, s, {}) : null;
    },
    fix: () => ({ summary: 'Replace with CSS.', code: '<!-- <center> → -->\n<div style="text-align:center">…</div>' }),
  },
  {
    id: 'click-div', wcag: '2.1.1 / 4.1.2', severity: 'serious',
    title: 'Clickable element not keyboard reachable',
    why: 'A div/span that reacts to clicks but has no role and no tabindex is invisible to keyboards and screen readers.',
    check(s, ctx) {
      if (!['div', 'span', 'li', 'img', 'p'].includes(s.tag)) return null;
      const clickable = s.attrs.onclick !== undefined || s.computed.cursor === 'pointer';
      if (!clickable) return null;
      if (s.attrs.role || s.attrs.tabindex !== undefined) return null;
      if (s.parents.some(p => p.tag === 'a' || p.tag === 'button')) return null;
      return violation(this, s, {});
    },
    fix: () => ({ summary: 'Make it a real <button>, or add role + tabindex + key handlers.', code: '<button type="button" class="card">…</button>' }),
  },
  {
    id: 'aria-hidden-focus', wcag: '1.3.1 / 4.1.2', severity: 'critical',
    title: 'Focusable element inside aria-hidden',
    why: 'The element is hidden from screen readers but still in tab order — focus lands on silence.',
    check(s, ctx) {
      if (!s.inAriaHidden) return null;
      if (s.attrs.tabindex !== undefined || FOCUSABLE_TAGS.includes(s.tag)) return violation(this, s, {});
      return null;
    },
    fix: () => ({ summary: 'Take it out of the aria-hidden region, or add inert / tabindex="-1".', code: '<button inert>…</button>' }),
  },
  {
    id: 'svg-no-name', wcag: '1.1.1', severity: 'moderate',
    title: 'Meaningful SVG has no accessible name',
    why: 'Inline SVG with role="img" is announced as an image; without a name nothing is conveyed.',
    check(s, ctx) {
      return (s.tag === 'svg' && s.attrs.role === 'img' && !s.attrs['aria-label'] && !s.flags.svgTitle)
        ? violation(this, s, {}) : null;
    },
    fix: () => ({ summary: 'Add aria-label (or a <title> child), or role="presentation" for decorative SVG.', code: '<svg role="img" aria-label="Fovea logo">…' }),
  },
];

// Deterministic suggestion: mix the failing color toward black or white (whichever side
// of the background it sits on) until it passes; fall back to pure black/white.
export function suggestTextColor(fg, bg) {
  const ratio = c => contrastRatio(c, bg);
  if (ratio([0, 0, 0, 1]) >= 4.5) return '#000000';
  if (ratio([255, 255, 255, 1]) >= 4.5) return '#ffffff';
  const towardBlack = relativeLuminance(fg) > relativeLuminance(bg); // fg brighter → darken it
  for (let step = 5; step <= 100; step += 5) {
    const mix = fg.map((c, i) => {
      if (i === 3) return 1;
      return towardBlack
        ? Math.round(c * (1 - step / 100))
        : Math.round(c + (255 - c) * (step / 100));
    });
    if (ratio(mix) >= 4.5) return `rgb(${mix[0]} ${mix[1]} ${mix[2]})`;
  }
  return towardBlack ? '#000000' : '#ffffff';
}

export function runRules(snapshots) {
  const ctx = buildCtx(snapshots);
  const out = [];
  for (const s of snapshots) {
    for (const rule of RULES) {
      let v = null;
      try { v = rule.check(s, ctx); } catch { v = null; }
      if (v) out.push(v);
    }
    // sequential state advances AFTER the snapshot is checked: heading-order compares
    // against the previous text heading, not the document's final state
    const m = /^h([1-6])$/.exec(s.tag);
    if (m && (s.text || '').trim()) ctx.lastHeading = Number(m[1]);
  }
  return dedupeSubtrees(out, snapshots);
}

// A cursor:pointer widget root makes every child LOOK clickable too (cursor inherits),
// so click-div reports only the outermost flagged element: drop a violation when one of
// its ancestors is also flagged. Contrast is NOT deduped this way — every text run is
// its own violation.
function dedupeSubtrees(violations, snapshots) {
  const clickDivs = violations.filter(v => v.ruleId === 'click-div');
  if (clickDivs.length < 2) return violations;
  const idxSet = new Set(clickDivs.map(v => v.elIndex));
  const drop = new Set();
  for (const v of clickDivs) {
    const snap = snapshots[v.elIndex];
    if ((snap?.parents || []).some(p => idxSet.has(p.index))) drop.add(v);
  }
  return drop.size ? violations.filter(v => !drop.has(v)) : violations;
}

export function buildCtx(snapshots) {
  const byId = new Map();
  const firstIdOwner = new Map();
  const dupeIds = new Set();
  const tablesWithTh = new Set();
  let hasH1 = false, hasTitle = false;
  const stack = [];

  snapshots.forEach((s, i) => {
    s.i = i;
    while (stack.length && stack[stack.length - 1].depth >= s.depth) stack.pop();
    s.parents = stack.map(c => ({ index: c.index, tag: c.tag }));
    const encTable = [...stack].reverse().find(c => c.tag === 'table');

    if (s.attrs.id) {
      if (firstIdOwner.has(s.attrs.id)) dupeIds.add(s.attrs.id);
      else firstIdOwner.set(s.attrs.id, i);
      byId.set(s.attrs.id, s);
    }
    if (s.tag === 'h1') hasH1 = true;
    if (s.tag === 'title' && hasText(s)) hasTitle = true;
    if (s.tag === 'th' && encTable) tablesWithTh.add(encTable.index);
    stack.push({ index: i, tag: s.tag, depth: s.depth });
  });

  return { snapshots, byId, dupeIds, firstIdOwner, tablesWithTh, hasH1, hasTitle, lastHeading: null };
}
