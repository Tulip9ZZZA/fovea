# DECISIONS.md — why Fovea exists the way it does

This document records the load-bearing decisions made while building Fovea during
Next Byte Hacks V5 (Oct 6 – Nov 7, 2026). It exists to show our reasoning is our own
and to explain what we deliberately did NOT build.

## 1. Why an accessibility X-ray (idea selection, judged)

We generated five candidate ideas (accessibility X-ray, git-history code galaxy,
hand-written CRDT canvas, procedural planet generator, microphone hearing-safety meter)
and had two independent, fresh-context judges score them against the actual hackathon
rubric (Innovation / Technical Complexity / Functionality / Presentation, 25% each) plus
an analysis of 15 past Devpost winners. Both judges independently picked the accessibility
X-ray as the only candidate scoring ≥7 on all four axes. Their verdicts also shaped scope:

- From judge 1: the before/after fix-diff should be the spine of the demo, and the tool
  must audit a real, recognizable page — not only a fictional demo shop.
- From judge 2: add a **Live Fix Mode** (apply a suggested fix to the sandboxed copy and
  watch the score move) and a **batch audit pipeline** over a corpus of real homepages,
  so the project is a fetch → rewrite → render → analyze → aggregate → rank pipeline, not
  just a per-page linter.
- Shared warning from both judges: cross-origin iframes cannot be read by page JavaScript.
  Our answer is the same-origin proxy (see §3).

We did not copy any past winner's idea, code, UI, or wording. References were used only
to understand what quality looks like. The closest past winner thematically was a
sign-language translator; Fovea is a developer tool in a different problem space (web
accessibility auditing), and no code or assets overlap.

## 2. Name

"Fovea" is the small pit in the retina where vision is sharpest. The tool's premise is the
opposite: most of your users do not see your site through a perfect fovea. We checked that
no established accessibility tool already uses the name (searched Nov 5, 2026).

## 3. Architecture: why the browser computes the cascade

Contrast checking that ignores real CSS produces confident nonsense. Naive tools fetch
HTML and guess styles; we render the page in a real browser engine and read
`getComputedStyle()` on every element, so cascade, inheritance, and media queries are
already resolved. The audit runs on a *normalized snapshot* (tag, attributes, geometry,
computed colors, visibility, text) extracted from the live DOM. Every rule, the scoring
engine, and the tab-order/reading-order algorithms operate on those snapshots as pure
functions — which is why the same code runs in three places: the app (browser), the unit
tests (Node), and the batch crawler (headless Chromium via Playwright).

Two deliberate safety choices inside the snapshot iframe:
- Audited pages are rendered with scripts **stripped** and the iframe sandboxed without
  `allow-scripts` (XSS containment), but with `allow-same-origin` so the engine can read
  the DOM. We audit markup and styles, not client-side app state — labeled honestly in the UI.
- Background colors are alpha-composited up the ancestor chain (rgba over rgba over…)
  until opaque. Elements whose background is a gradient or image are flagged "manual
  check" instead of being silently passed or failed.

## 4. Same-origin proxy (the load-bearing risk)

Pasting "any URL" only works if the server fetches the HTML, rewrites every asset URL
(CSS, images, fonts) to route through the proxy, and serves it from our own origin. We
added the SSRF guard (private-IP ranges rejected), size caps, timeouts, and script
stripping. Heavy client-side-rendered sites may still degrade; when the proxy cannot
faithfully mirror a page, the UI says so and points to paste-HTML mode instead of
showing an empty X-ray.

## 5. Accessibility of the claim

We say "WCAG 2.2-aligned", and the About panel enumerates exactly which success criteria
the rule set covers (~24 rules across contrast, names/labels, structure, keyboard, and
forms). We do not claim full WCAG conformance testing, and we label the screen-reader
transcript and disability simulations as approximations for awareness, not clinical tools.
The Access Score is our own weighted model, fully explained in the UI (severity × scope
per open violation) — it is a triage signal, not a certification.

## 6. What we cut (scope discipline)

- No accessibility tree reconstruction (browser `accessibility.GetSnapshot` APIs differ
  per engine); our reading-order transcript is DOM-order based and labeled approximate.
- No auto-fix persistence: Live Fix Mode edits the in-memory sandboxed copy so you can
  see the score move; the copy-paste snippets are the real deliverable.
- Corpus pages store **audit results** (violations, scores, metadata, fetch provenance),
  not full page copies — keeps the repo light and avoids redistributing other sites' assets.
- No external AI calls anywhere: every check is deterministic, local math you can verify.

## 7. How AI was used

Fovea was built with AI coding agents working from an architecture the team specified,
with every file reviewed and every number (contrast math, color-blindness matrices,
scoring weights) verified against published sources and unit tests. The idea, scope,
product decisions, and quality bar were human decisions made through the judged process
recorded above; the AI disclosures in README.md and the Devpost submission match this text.
