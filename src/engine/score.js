// score.js — the Access Score: Fovea's own weighted triage model, fully deterministic.
// Deduction per violation = severity weight × scope × diminishing-returns factor
// (the 6th+ violation of the same rule deducts at 25% so one repeated mistake in a
// image gallery doesn't zero the page). 100 = no open violations.

const SEVERITY_WEIGHT = { critical: 8, serious: 5, moderate: 2, minor: 0.5 };
const INTERACTIVE_TAGS = new Set(['a', 'button', 'input', 'select', 'textarea', 'iframe', 'summary']);

function scope(v) {
  if (v.pageLevel) return 2;                    // whole-page failures hit everyone
  if (INTERACTIVE_TAGS.has(v.tag)) return 1.2;  // blocks a task the user is trying to do
  if (v.tag === 'img' || v.ruleId === 'contrast') return 1;
  return 0.8;
}

export function computeScore(violations) {
  const seen = new Map();
  let deduction = 0;
  const scored = violations.map(v => {
    const n = seen.get(v.ruleId) || 0;
    seen.set(v.ruleId, n + 1);
    const diminishing = n < 5 ? 1 : 0.25;
    const w = (SEVERITY_WEIGHT[v.severity] ?? 1) * scope(v) * diminishing;
    return { v, w };
  });
  for (const { w } of scored) deduction += w;
  // floor, not round: a page with any open violation can never display a perfect 100
  const score = Math.max(0, Math.min(100, Math.floor(100 - deduction)));
  const counts = { critical: 0, serious: 0, moderate: 0, minor: 0 };
  for (const v of violations) counts[v.severity] = (counts[v.severity] || 0) + 1;
  const grade = score >= 97 ? 'A+' : score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 65 ? 'C' : score >= 50 ? 'D' : 'F';
  const topDrivers = [...scored].sort((a, b) => b.w - a.w).slice(0, 3).map(x => x.v);
  return { score, grade, counts, total: violations.length, topDrivers };
}

export function prioritize(violations) {
  const seen = new Map();
  return [...violations]
    .map(v => {
      const n = seen.get(v.ruleId) || 0;
      seen.set(v.ruleId, n + 1);
      const diminishing = n < 5 ? 1 : 0.25;
      return { v, w: (SEVERITY_WEIGHT[v.severity] ?? 1) * scope(v) * diminishing };
    })
    .sort((a, b) => b.w - a.w)
    .map(x => x.v);
}

export function severityWeight(sev) { return SEVERITY_WEIGHT[sev] ?? 1; }
export function violationScope(v) { return scope(v); }
