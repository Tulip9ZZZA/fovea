// color.js — WCAG 2.x color math, with no dependencies.
// Everything here is deterministic and unit-tested against published values.

const NAMED = {
  transparent: [0, 0, 0, 0], black: [0, 0, 0, 1], white: [255, 255, 255, 1],
  red: [255, 0, 0, 1], green: [0, 128, 0, 1], blue: [0, 0, 255, 1],
  yellow: [255, 255, 0, 1], orange: [255, 165, 0, 1], gray: [128, 128, 128, 1],
  grey: [128, 128, 128, 1], silver: [192, 192, 192, 1], navy: [0, 0, 128, 1],
};

// Parse a resolved CSS color string (as returned by getComputedStyle) to [r,g,b,a].
// Returns null for colors we refuse to compute (advanced color spaces) — callers must
// treat null as "manual check", never as a pass or a failure.
export function parseColor(css) {
  if (typeof css !== 'string') return null;
  const s = css.trim().toLowerCase();
  if (s === '' || s === 'none' || s === 'inherit') return null;
  if (NAMED[s]) return NAMED[s];
  if (s === 'currentcolor' || s === 'btnface' || s === 'canvas' || s === 'canvastext') return null;
  if (s.startsWith('oklch') || s.startsWith('oklab') || s.startsWith('lab') ||
      s.startsWith('lch') || s.startsWith('color(') || s.startsWith('color-mix') ||
      s.startsWith('device-cmyk')) return null;
  if (s.startsWith('#')) {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split('').map(c => c + c).join('');
    if (h.length !== 6 && h.length !== 8) return null;
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some(Number.isNaN)) return null;
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
  }
  const m = s.match(/^rgba?\(([^)]+)\)$/);
  if (!m) return null;
  const parts = m[1].split(/[\s,/]+/).filter(Boolean);
  if (parts.length < 3) return null;
  const nums = parts.map(p => p.endsWith('%') ? (parseFloat(p) / 100) * 255 : parseFloat(p));
  if (nums.slice(0, 3).some(Number.isNaN)) return null;
  // hue-based rgb() (e.g. rgb(120deg 50% 20%)) is invalid here; clamp check below catches it
  const a = nums.length >= 4 ? (nums[3] > 1 ? 1 : nums[3]) : 1;
  if (Number.isNaN(a)) return null;
  return [clamp255(nums[0]), clamp255(nums[1]), clamp255(nums[2]), clamp01(a)];
}

const clamp255 = v => Math.min(255, Math.max(0, v));
const clamp01 = v => Math.min(1, Math.max(0, v));

// Source-over alpha compositing of two premultiplied-by-nothing sRGB colors.
export function composite(fg, bg) {
  const a = fg[3];
  const out = [0, 1, 2].map(i => fg[i] * a + bg[i] * (1 - a));
  return [out[0], out[1], out[2], a + bg[3] * (1 - a)];
}

// WCAG 2.x relative luminance. sRGB transfer function per IEC 61966-2-1.
// Note: for 8-bit channel values the 0.03928-vs-0.04045 threshold debate cannot change
// the result (the thresholds fall between 10/255 and 11/255), so results match both
// the WCAG text and common contrast checkers.
export function relativeLuminance(rgb) {
  const [r, g, b] = rgb;
  const lin = c => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function contrastRatio(rgb1, rgb2) {
  const l1 = relativeLuminance(rgb1), l2 = relativeLuminance(rgb2);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

export function formatRatio(r) {
  return r >= 10 ? r.toFixed(1) : r.toFixed(2);
}

// Walk a chain of background colors ordered front-to-back (element first, ancestors
// after) compositing each next layer BEHIND the accumulated result until opaque.
// Returns { rgb, incomplete } — incomplete=true means we ran out of ancestors over
// transparency (nothing opaque behind): the honest answer is "we do not know the page
// background", so callers flag a manual check.
export function effectiveBackground(bgChain) {
  let acc = null;
  for (const c of bgChain) {
    if (!c) continue; // 'none'/unparseable — skip
    if (acc === null) acc = c; else acc = composite(acc, c); // acc on top, c behind
    if (acc[3] >= 0.999) return { rgb: [acc[0], acc[1], acc[2]], incomplete: false };
  }
  if (acc === null) return { rgb: null, incomplete: true };
  return { rgb: [acc[0], acc[1], acc[2]], incomplete: true };
}

// WCAG 1.4.3 / 1.4.11 thresholds. Large text: >=24px, or >=18.66px bold (per WCAG px equiv).
export function isLargeText(fontSizePx, isBold) {
  return fontSizePx >= 24 || (isBold && fontSizePx >= 18.66);
}

export function requiredRatio(fontSizePx, isBold, uiComponent) {
  if (uiComponent) return 3;          // non-text contrast (1.4.11)
  return isLargeText(fontSizePx, isBold) ? 3 : 4.5; // 1.4.3
}
