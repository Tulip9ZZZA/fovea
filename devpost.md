# Devpost submission copy (paste-ready)

## Title
Fovea — the accessibility X-ray for the web

## Tagline (short description)
See your website the way users with disabilities do: violations stamped on the live page, disability simulations, a keyboard-only tab path — and one-click live fixes with the score moving as you watch.

## Description

**95.9% of the top one million home pages have detectable WCAG 2 failures** (WebAIM Million 2026) — an average of 56 errors per page, serving 1.3 billion people who live with a significant disability (WHO). In 2024 alone, digital accessibility drove more than 4,000 ADA lawsuits (UsableNet).

The failures are invisible: a 2.4:1 contrast ratio looks fine on your monitor; an unlabeled button works fine with a mouse. **Fovea makes them visible — then fixes them, live.**

**What it does**
- **X-ray any page.** Paste a URL (audited through a same-origin proxy with scripts stripped) or open the built-in demo shop. Violations are stamped directly onto the real elements — 24 WCAG 2.2-aligned rules across contrast, names/labels, structure, keyboard and forms — and an Access Score (66/100 for the demo shop) summarizes the damage.
- **Step into your users' shoes.** One click switches the page through protanopia, deuteranopia and tritanopia (real Machado 2009 color-science matrices), low-vision tunnel+blur, and a keyboard-only mode that dims everything except the numbered tab path — where you can watch a `tabindex="5"` hack break the whole order.
- **Hear what a screen reader hears.** A reading-order transcript shows exactly what assistive tech would announce — "edit text" with no hint of what to type, links named "click here", focus landing on silence inside `aria-hidden`.
- **Fix it live.** Click *Fix all* on a rule: Fovea edits the sandboxed copy, re-scans, and the Access Score moves on camera — 66 → 89 in our demo — with copy-paste snippets for the real codebase.
- **Audit the web at scale.** The same engine runs headlessly (Playwright) across a corpus of 50 real homepages through our fetch → rewrite → render → analyze → aggregate pipeline: 1,662 violations found, 733 of them critical, on 21 of 50 pages — even among governments, universities and standards bodies.

**The problem it solves:** teams don't ignore accessibility; they can't see it. Static reports list selectors; disabled users get a page that "works." Fovea closes the gap between the report and the experience — you watch the page become unusable, then watch the fix work.

**How it works (under the hood):** the audited page renders in a sandboxed iframe (scripts stripped, same-origin readable). One DOM walk produces element snapshots with real `getComputedStyle()` values; a pure, dependency-free engine runs 24 rules (WCAG relative-luminance contrast with ancestor alpha-compositing, tab-order semantics, reading order, label resolution), computes the weighted Access Score, and renders the X-ray overlay. The identical engine powers the browser app, 39 Node unit tests with WCAG golden values, 13 Playwright e2e tests, and the corpus crawler. Zero API keys, zero external AI calls, everything local.

**Why we built it this way:** contrast math on raw HTML produces confident nonsense — so Fovea renders instead of guessing, alpha-composites rgba backgrounds up the ancestor chain, and honestly flags gradients and advanced color spaces as "manual check" instead of inventing numbers. The honesty box in the README lists what Fovea deliberately does not do.

## Technologies used
- JavaScript (ES modules, no framework, no build step) — frontend app + engine
- Node.js ≥20 — server, engine runtime, tests
- Express (MIT) — the only runtime dependency: static serving + same-origin audit proxy
- WCAG 2.2 / WCAG 2.x color science — relative luminance, contrast ratios, alpha compositing (own implementation, unit-tested)
- Machado, Oliveira & Fernandes (2009) color-vision deficiency matrices — simulation filters
- Playwright (Apache-2.0, dev) — 13 end-to-end tests + headless corpus crawler
- node:test — 39 unit tests
- HTML sandboxing + SSRF-guarded fetch proxy (private-range blocking, script stripping, asset rewriting)
- git / GitHub — source, MIT licensed

## Challenges we ran into
- **Cross-origin iframes are unreadable** — the whole "audit any URL" idea dies without a same-origin proxy; building one that rewrites assets, strips every script vector and blocks SSRF was the riskiest piece.
- **Contrast math lies if you let it.** Naive tools compute against a transparent background; we had to alpha-composite the ancestor chain and treat gradients/oklch as manual checks. Unit tests pin the classic AA boundary (#767676 passes at 4.54:1, #777777 fails at 4.48:1).
- **Scoring calibration.** Per-instance deductions zeroed realistic pages (score 0); we rebuilt the model around per-rule saturation so repetition can't dominate — the demo lands at 66 → 89.
- **Demo integrity.** Our first on-camera pick (gnu.org) turned out unreachable from our network — rehearsal caught it, so the recorded demo uses debian.org, audited live, nothing faked.

## What we learned
- Rendering beats parsing: reading real computed styles through the browser's cascade is the only honest way to check contrast — and the only way the audit can run the same code in a browser, in Node tests, and headlessly.
- Accessibility failures are mostly *invisible by default* — the X-ray metaphor (violations stamped on the pixels) communicated faster in 10 seconds of video than any feature list.
- A scoring model is a product decision: saturating per-rule deductions turned a number nobody trusted into one that moves believably.

## What's next
- Persisted fix reports (export the before/after diff as JSON/HTML)
- More success criteria (focus order, error identification, non-text contrast on UI components)
- A crawl-your-own-sitemap mode and CI integration (fail a PR when the Access Score drops)
- Larger, stratified corpus with scheduled re-crawls

## How AI was used (honest disclosure)
Fovea was built during the hackathon with AI coding agents working from a team-specified architecture and quality bar (judged idea selection, reference analysis of past winners, builder/critic review). Every file was reviewed and every check is deterministic, unit-tested math — no generated code was pasted blindly, no third-party code was copied, and no feature is mocked on camera. The idea, scope, naming and every product decision are ours; the AI tools' terms were followed throughout.

## Team
【Fill in: your name + Devpost handle — team of 1】

## Demo video
`demo_raw.mp4` (silent raw take, 2:47, 1080p) + `voiceover.txt` (exact narration, timed to beats) → final upload must include your recorded voiceover or captions. 【The uploaded video must have the voiceover added — see CHECKLIST.md】

## Links
- GitHub repo: 【add after creating the public repo — see manual steps】
- Try it locally: `npm install && npm start` → http://localhost:3000
