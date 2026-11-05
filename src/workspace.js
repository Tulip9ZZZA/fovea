// workspace.js — the Fovea workspace: scan, X-ray overlay, simulations, keyboard path,
// transcript, and Live Fix Mode. Engine runs in THIS page against the sandboxed iframe.

import { scanDocument } from './engine/scanner.js';
import { tabOrder } from './engine/taborder.js';
import { readingTranscript } from './engine/readingorder.js';
import { prioritize, severityWeight } from './engine/score.js';
import { SIMS, cssFilter } from './engine/sim.js';
import { RULES } from './engine/rules.js';
import { canFix, applyFix } from './fixes.js';

const $ = id => document.getElementById(id);
const stage = $('stage');
const overlay = $('overlay');
const state = {
  result: null,          // full scan result
  xray: true,
  sim: 'none',
  tabMode: false,
  fixedRules: new Map(), // ruleId -> instances fixed this session
  beforeScore: null,
  afterScore: null,
  fixCount: 0,
  source: 'demo',
};

// ---------- SVG color-matrix filters ----------
for (const [id, sim] of Object.entries(SIMS)) {
  if (!sim.matrix) continue;
  const node = document.getElementById(`m-${id}`);
  if (node) node.setAttribute('values', sim.matrix.join(' '));
}

// ---------- loading a target ----------
const params = new URLSearchParams(location.search);
let loadToken = 0;

function setSource(kind) {
  state.source = kind;
  $('sourceBadge').textContent = {
    demo: 'Source: built-in demo shop (fictional)',
    url: 'Source: same-origin proxy · scripts stripped',
    paste: 'Source: pasted HTML · scripts never ran',
  }[kind];
}

async function loadDemo() {
  setSource('demo');
  stage.removeAttribute('srcdoc');
  stage.removeAttribute('csp');
  stage.setAttribute('sandbox', 'allow-same-origin');
  stage.src = '/demo/novamart.html';
}

async function loadUrl(u) {
  setSource('url');
  state.pendingUrl = u;
  stage.setAttribute('sandbox', 'allow-same-origin');
  stage.removeAttribute('srcdoc');
  stage.src = '/proxy?url=' + encodeURIComponent(u);
}

function loadPaste(html) {
  setSource('paste');
  // srcdoc with sandbox (no allow-scripts): markup is readable, scripts never run
  stage.srcdoc = html;
}

if (params.get('demo')) { loadDemo(); }
else if (params.get('paste')) { const h = sessionStorage.getItem('fovea-paste') || '<p></p>'; loadPaste(h); }
else if (params.get('url')) { loadUrl(params.get('url')); }
else { loadDemo(); }

$('urlForm').addEventListener('submit', e => {
  e.preventDefault();
  const u = $('url').value.trim();
  if (u) loadUrl(u);
});
$('btnDemo').addEventListener('click', () => { resetSession(); loadDemo(); });

// ---------- scanning ----------
stage.addEventListener('load', () => {
  // srcdoc/paste loads can beat the demo navigation; both paths land here
  setTimeout(() => scanNow(), 60);
});

function scanNow() {
  const token = ++loadToken;
  let doc;
  try {
    doc = stage.contentDocument;
    if (!doc || !doc.documentElement) return;
  } catch { return; }
  const result = scanDocument(doc, {
    url: state.source === 'url' ? state.pendingUrl : (state.source === 'demo' ? 'demo://novamart' : 'pasted HTML'),
    source: state.source,
  });
  if (token !== loadToken) return; // a newer load superseded this scan
  state.result = result;
  if (state.beforeScore === null) state.beforeScore = result.score.score;
  state.afterScore = result.score.score;
  window.__lastScanResult = result; // consumed by the batch crawler
  window.dispatchEvent(new CustomEvent('fovea:scanned'));
  render();
}

// ---------- rendering ----------
const sevOrder = { critical: 0, serious: 1, moderate: 2, minor: 3 };

function render() {
  const r = state.result;
  if (!r) return;
  renderDial(r.score);
  renderViolations();
  bumpOverlay();
}

function renderDial(score) {
  const C = 2 * Math.PI * 46;
  $('scoreVal').textContent = score.score;
  $('gradePill').textContent = `Grade ${score.grade}`;
  $('cCritical').textContent = score.counts.critical || 0;
  $('cSerious').textContent = score.counts.serious || 0;
  $('cModerate').textContent = score.counts.moderate || 0;
  $('cMinor').textContent = score.counts.minor || 0;
  const arc = $('dialArc');
  arc.style.strokeDashoffset = String(C * (1 - score.score / 100));
  arc.style.stroke = score.score >= 90 ? '#0e7a4d' : score.score >= 65 ? '#d9b02e' : '#d64545';
  // count-up animation
  const el = $('scoreVal');
  const from = parseInt(el.dataset.from || '0', 10);
  const to = score.score;
  const t0 = performance.now();
  const step = now => {
    const p = Math.min(1, (now - t0) / 700);
    el.textContent = String(Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  el.dataset.from = String(to);
  $('pageTitle').textContent = state.result.meta.title || '(untitled page)';
  $('scanMeta').textContent = `${state.result.meta.url || ''} · ${state.result.violations.length} open violations`;
  $('beforeScore').textContent = state.beforeScore ?? '–';
  $('afterScore').textContent = state.afterScore ?? '–';
  $('fixCount').textContent = state.fixCount;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderViolations() {
  const r = state.result;
  const list = $('vlist');
  list.innerHTML = '';
  const open = prioritize(r.violations);
  const fixedRows = [...state.fixedRules.entries()];
  $('vCount').textContent = `(${r.violations.length} open · ${fixedRows.length} rules fixed live)`;
  for (const v of open) {
    const item = document.createElement('div');
    item.className = 'vitem';
    item.dataset.key = v.ruleId + '|' + v.selector;
    const extra = v.ratio ? `${v.ratio}:1 vs ${v.required}:1 required` : '';
    const openSameRule = open.filter(x => x.ruleId === v.ruleId).length;
    item.innerHTML = `
      <div class="vrow">
        <span class="vt">${escapeHtml(v.title)}</span>
        <span class="chip ${v.severity}">${v.severity}</span>
      </div>
      <div class="vs">${escapeHtml(v.why)}${extra ? ` — <b>${extra}</b>.` : ''}</div>
      <div class="sel">${escapeHtml(v.selector)} · WCAG ${escapeHtml(v.wcag)}</div>
      <div class="actions">
        <button class="btn small ghost" data-act="locate">Locate</button>
        ${canFix(v.ruleId) ? `<button class="btn small primary" data-act="fix">Fix all${openSameRule > 1 ? ` (${openSameRule})` : ''}</button>` : ''}
      </div>`;
    item.addEventListener('click', e => {
      if (e.target.dataset.act === 'fix') { applyLive(v, item); return; }
      locate(v, item);
    });
    list.appendChild(item);
  }
  // session record of rules fixed live (they are gone from the re-scan)
  for (const [ruleId, n] of fixedRows) {
    const rule = RULES.find(x => x.id === ruleId);
    if ($('hideFixed').checked) continue;
    const item = document.createElement('div');
    item.className = 'vitem fixed';
    item.innerHTML = `
      <div class="vrow">
        <span class="vt">${escapeHtml(rule ? rule.title : ruleId)}</span>
        <span class="fixedbadge">✓ fixed live</span>
      </div>
      <div class="vs">${n} instance${n === 1 ? '' : 's'} corrected in this session — re-scan is clean for this rule.</div>`;
    list.appendChild(item);
  }
}

function locate(v, item) {
  const el = stage.contentDocument?.querySelector(v.selector);
  if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  document.querySelectorAll('.vitem.selected')?.forEach(x => x.style.background = '');
  item.style.background = '#eef7f1';
  setTimeout(() => { item.style.background = ''; }, 1200);
  const chip = overlay.querySelector(`[data-key="${CSS.escape(v.ruleId + '|' + v.selector)}"]`);
  if (chip) { chip.classList.remove('pulse'); void chip.offsetWidth; chip.classList.add('pulse'); }
}

function applyLive(v, item) {
  const doc = stage.contentDocument;
  if (!doc) return;
  // one click fixes every open instance of the rule, so the score jump is visible
  const same = state.result.violations.filter(x => x.ruleId === v.ruleId);
  let applied = 0;
  same.forEach(x => {
    if (applyFix(v.ruleId, x, doc, state.fixCount + applied)) applied += 1;
  });
  if (!applied) return;
  state.fixedRules.set(v.ruleId, (state.fixedRules.get(v.ruleId) || 0) + applied);
  state.fixCount += applied;
  setTimeout(() => scanNow(), 30);
}

// ---------- overlay (X-ray + keyboard path) ----------
// Chips are rebuilt only when the scan changes (overlayVersion); every animation
// frame updates geometry only, so the stamp animation plays exactly once.
const chipRefs = []; // {node, el|null, fallbackRect}
let overlayVersion = 0;
let builtVersion = -1;

function bumpOverlay() { overlayVersion++; renderTranscript(); }

function renderOverlay() { requestAnimationFrame(tick); }

function buildOverlay() {
  builtVersion = overlayVersion;
  chipRefs.length = 0;
  overlay.querySelectorAll('.vchip,.kchip,.dim-layer,.dim-hole').forEach(n => n.remove());
  const r = state.result;
  if (!r) return;
  if (state.tabMode) {
    const dim = document.createElement('div');
    dim.className = 'dim-layer';
    overlay.appendChild(dim);
    const order = tabOrder(r.snapshots).slice(0, 40);
    order.forEach((idx, n) => {
      const s = r.snapshots[idx];
      const el = s.el;
      if (!el) return;
      const hole = document.createElement('div');
      hole.className = 'dim-hole';
      overlay.appendChild(hole);
      const chip = document.createElement('div');
      chip.className = 'kchip';
      chip.textContent = String(n + 1);
      overlay.appendChild(chip);
      chipRefs.push({ node: hole, el, fallbackRect: null });
      chipRefs.push({ node: chip, el, fallbackRect: null });
    });
    return;
  }
  if (!state.xray) return;
  const doc = stage.contentDocument;
  r.violations.forEach((v, i) => {
    const el = doc?.querySelector(v.selector);
    if (!el && !(v.rect.w > 1)) return;
    const chip = document.createElement('div');
    chip.className = `vchip ${v.severity}`;
    chip.dataset.key = v.ruleId + '|' + v.selector;
    chip.style.animationDelay = `${Math.min(i * 22, 900)}ms`;
    chip.innerHTML = `<span class="tag">${short(v.ruleId)}</span>`;
    overlay.appendChild(chip);
    chipRefs.push({ node: chip, el, fallbackRect: el ? null : v.rect });
  });
}

function tick() {
  if (builtVersion !== overlayVersion) buildOverlay();
  for (const c of chipRefs) {
    const rect = c.el && c.el.isConnected
      ? c.el.getBoundingClientRect()
      : c.fallbackRect;
    if (!rect || (rect.width < 1 && rect.height < 1)) { c.node.style.display = 'none'; continue; }
    c.node.style.display = '';
    if (c.node.classList.contains('kchip')) {
      // keyboard chips stay badge-sized and track the element's center
      c.node.style.left = `${rect.x + rect.width / 2 - 12}px`;
      c.node.style.top = `${rect.y + rect.height / 2 - 12}px`;
      continue;
    }
    const pad = c.node.classList.contains('vchip') ? 2 : 3;
    c.node.style.left = `${rect.x - pad}px`;
    c.node.style.top = `${rect.y - pad}px`;
    c.node.style.width = `${rect.width + pad * 2}px`;
    c.node.style.height = `${rect.height + pad * 2}px`;
  }
  requestAnimationFrame(tick);
}

function short(ruleId) {
  const map = {
    contrast: 'contrast', 'img-no-alt': 'no alt', 'img-link-no-name': 'link no name',
    'input-no-label': 'no label', 'button-no-name': 'no name', 'link-vague-text': 'vague link',
    'heading-order': 'heading skip', 'no-h1': 'no h1', 'heading-empty': 'empty heading',
    'html-no-lang': 'no lang', 'title-missing': 'no title', 'iframe-no-title': 'iframe no title',
    'positive-tabindex': 'tabindex+', 'label-orphan': 'orphan label', 'duplicate-id': 'dup id',
    'viewport-zoom': 'zoom blocked', 'autocomplete-missing': 'no autocomplete',
    'table-no-header': 'no headers', 'target-blank': 'new window', 'obsolete-element': 'obsolete',
    'click-div': 'not keyboard', 'aria-hidden-focus': 'hidden focus', 'svg-no-name': 'svg no name',
  };
  return map[ruleId] || ruleId;
}

// ---------- controls ----------
$('btnXray').addEventListener('click', () => {
  state.xray = !state.xray;
  $('btnXray').setAttribute('aria-pressed', String(state.xray));
  bumpOverlay();
});
$('hideFixed').addEventListener('change', () => bumpOverlay());

$('simSelect').addEventListener('change', e => {
  state.sim = e.target.value;
  const sim = SIMS[state.sim];
  stage.style.filter = state.sim === 'none' ? '' : cssFilter(state.sim);
  $('vignette').style.display = sim?.vignette ? 'block' : 'none';
});

$('btnTab').addEventListener('click', () => {
  state.tabMode = !state.tabMode;
  $('btnTab').setAttribute('aria-pressed', String(state.tabMode));
  if (state.tabMode) { state.xray = false; $('btnXray').setAttribute('aria-pressed', 'false'); stage.style.filter = 'brightness(.45)'; }
  else { stage.style.filter = ''; }
  bumpOverlay();
});

$('btnScoreInfo').addEventListener('click', () => $('scoreInfo').classList.add('open'));
$('scoreInfo').addEventListener('click', e => { if (e.target === $('scoreInfo')) $('scoreInfo').classList.remove('open'); });

// transcript drawer
$('drawerHead').addEventListener('click', () => {
  const b = $('transcriptBody');
  b.hidden = !b.hidden;
  $('drawerChevron').textContent = b.hidden ? '▾' : '▴';
});

function renderTranscript() {
  const r = state.result;
  const lines = readingTranscript(r.snapshots);
  const body = $('transcriptBody');
  body.innerHTML = '';
  for (const l of lines.slice(0, 120)) {
    const warn = l.text.includes('no alt text read out') || l.text.includes('no label read out') || l.text.includes('no name');
    const row = document.createElement('div');
    row.className = 'ln' + (warn ? ' warn' : '');
    row.innerHTML = `<span class="k">${l.kind}</span><span class="t">${escapeHtml(l.text)}</span>`;
    body.appendChild(row);
  }
  if (lines.length > 120) {
    const more = document.createElement('div');
    more.className = 'note';
    more.textContent = `… and ${lines.length - 120} more`;
    body.appendChild(more);
  }
}

function resetSession() {
  state.fixedRules.clear();
  state.fixCount = 0;
  state.beforeScore = null;
  state.afterScore = null;
}

// ready hook for the e2e suite / crawler
window.__foveaReady = true;
requestAnimationFrame(tick); // start the overlay geometry loop once
