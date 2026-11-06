// taborder.js — sequential focus navigation order, per HTML spec.
// Input: array of element snapshots in document order (as produced by scanner.js).
// Pure function — unit-testable without a browser.

const NATIVE_FOCUSABLE = new Set(['a', 'button', 'input', 'select', 'textarea', 'iframe', 'area', 'summary']);

function nativeFocusable(s) {
  if (NATIVE_FOCUSABLE.has(s.tag)) {
    if (s.tag === 'a' || s.tag === 'area') return s.attrs.href !== undefined;
    if (s.tag === 'input') return s.attrs.type !== 'hidden';
    if (s.tag === 'select' || s.tag === 'textarea' || s.tag === 'button' || s.tag === 'iframe' || s.tag === 'summary') {
      return !s.flags.disabled;
    }
    return true;
  }
  if (s.attrs.contenteditable === 'true' || s.attrs.contenteditable === 'plaintext-only') return true;
  if (s.tag === 'audio' || s.tag === 'video') return s.attrs.controls !== undefined;
  return false;
}

function isHidden(s) {
  return s.flags.displayNone || s.flags.visibilityHidden || s.flags.hiddenAttr ||
         s.rect.width === 0 || s.rect.height === 0;
}

// Returns array of snapshot indices in tab order.
// Spec: positive tabindex first (ascending; stable within equal values), then elements
// with no tabindex / tabindex=0 in document order. tabindex="-1" is NOT keyboard-focusable.
export function tabOrder(snapshots) {
  const idx = [];
  snapshots.forEach((s, i) => {
    if (isHidden(s)) return;
    const tb = s.attrs.tabindex;
    if (tb !== undefined && tb !== '' ) {
      const n = parseInt(tb, 10);
      if (Number.isNaN(n)) return;
      if (n === -1) return;                       // removed from tab order on purpose
      if (n > 0) { idx.push({ i, n }); return; }  // explicit positive override
      // n === 0 falls through to document order
    }
    if (nativeFocusable(s)) idx.push({ i, n: 0 });
  });
  // stable sort: positive tabindex ascending first, then document order
  const positives = idx.filter(x => x.n > 0).sort((x, y) => x.n - y.n);
  const rest = idx.filter(x => x.n === 0);
  return [...positives, ...rest].map(x => x.i);
}

// Keyboard-only "spotlight": which snapshots stay visible when only focus targets
// matter (used to render the keyboard simulation mode).
export function keyboardFocusSet(snapshots) {
  const order = tabOrder(snapshots);
  return new Set(order);
}
