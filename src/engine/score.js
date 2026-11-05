// score.js — the Access Score: Fovea's own weighted triage model, fully deterministic.
// Like Lighthouse, deductions aggregate per RULE, not per instance: a rule costs
// weight(severity of its worst open instance) × scope(worst instance) × saturation,
// where the first instance costs half and the weight saturates at 100% by the 9th
// occurrence (so a gallery of the same mistake can't zero the page, but repetition
// still hurts). 100 = no open violations.

const SEVERITY_WEIGHT = { critical: 6, serious: 3, moderate: 1.2, minor: 0.4 };
const INTERACTIVE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea', 'iframe', 'summary']);

function scope(v) {
  if (v.pageLevel) return 1.5;                  // whole-page failures hit everyone
  if (INTERACTIVE_TAGS.has(v.tag)) return 1.1;  // blocks a task the user is trying to do
  if (v.tag === 'img' || v.ruleId === 'contrast') return 1;
  return 0.7;
}

const saturation = occ => Math.min(1, 0.5 + 0.06 * occ);

export function ruleDeduction(v) {
  return (SEVERITY_WEIGHT[v.severity] ?? 1) * scope(v) * saturation(1);
}

export function computeScore(violations) {
  const groups = new Map(); // ruleId -> { occ, worstScope, worst }
  for (const v of violations) {
    const g = groups.get(v.ruleId) || { occ: 0, worstScope: 0, worst: v };
    g.occ += 1;
    const sc = scope(v);
    if (sc > g.worstScope) { g.worstScope = sc; g.worst = v; }
    groups.set(v.ruleId, g);
  }
  let deduction = 0;
  const perRule = new Map();
  for (const [ruleId, g] of groups) {
    const d = (SEVERITY_WEIGHT[g.worst.severity] ?? 1) * g.worstScope * saturation(g.occ);
    perRule.set(ruleId, d);
    deduction += d;
  }
  // floor, not round: a page with any open violation can never display a perfect 100
  const score = Math.max(0, Math.min(100, Math.floor(100 - deduction)));
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of violations) counts[v.severity] = (counts[v.severity] || 0) + 1;
  const grade = score >= 97 ? 'A+' : score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 65 ? 'C' : score >= 50 ? 'D' : 'F';
  const topDrivers = [...perRule.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([ruleId]) => groups.get(ruleId).worst);
  return { score, grade, counts, total: violations.length, topDrivers };
}

export function prioritize(violations) {
  return [...violations]
    .sort((a, b) => (SEVERITY_WEIGHT[b.severity] ?? 1) * scope(b) - (SEVERITY_WEIGHT[a.severity] ?? 1) * scope(a));
}

export function severityWeight(sev) { return SEVERITY_WEIGHT[sev] ?? 1; }
export function violationScope(v) { return scope(v); }
