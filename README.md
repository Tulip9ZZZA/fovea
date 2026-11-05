# Fovea — the accessibility X-ray for the web

**95.9% of the world's top one million home pages have detectable WCAG 2 failures** — an average of 56 errors per page, and the number got *worse* last year ([WebAIM Million 2026](https://webaim.org/projects/million/)). That's a billion-dollar blind spot serving **1.3 billion people who live with a significant disability** ([WHO](https://www.who.int/news-room/fact-sheets/detail/disability-and-health)) — and it landed in front of a judge more than **4,000 times in 2024** as ADA web lawsuits ([UsableNet](https://www.usablenet.com/ada-web-accessibility-lawsuit-report)).

The problem isn't that developers don't care. It's that accessibility failures are **invisible**: a contrast ratio of 2.4:1 looks fine on your monitor, an unlabeled button looks fine to your mouse. You can't fix what you can't see.

**Fovea makes it visible — then fixes it, live, while you watch.**

<p align="center"><img src="docs/screenshot-xray.png" alt="Fovea X-raying a shop page: violations stamped on the real elements, Access Score 66/100" width="820"></p>

## What Fovea does

Paste a URL (or open the built-in demo shop) and Fovea:

- **X-rays the real page** — violations are stamped directly onto the live elements: low contrast, missing labels, unnamed buttons, broken tab order, disabled pinch-to-zoom, and 19 more WCAG 2.2-aligned checks.
- **Puts you in your users' shoes** — one click switches the page through protanopia, deuteranopia, tritanopia, and low-vision tunnel vision (real color-science matrices, not a hue-rotate filter).
- **Shows the invisible** — a keyboard-only mode dims everything except the tab path with numbered focus stops, and a screen-reader transcript panel shows what assistive tech would read out, in reading order.
- **Fixes what it finds, live** — click *Fix all* on a rule and Fovea edits the sandboxed copy, re-scans, and the **Access Score moves on screen** — a before/after record with copy-paste snippets for your real code.
- **Audits the web at scale** — the same engine runs headlessly across a corpus of real homepages through a fetch → rewrite → render → analyze → aggregate pipeline. [See the corpus report](docs/screenshot-corpus.png) built from the committed results in `data/corpus/`.

Everything computes locally. No accounts, no API keys, no telemetry, no AI calls in the loop — the audit is deterministic math you can verify.

## Try it in 2 commands

```bash
npm install
npm start          # → http://localhost:3000
```

Then click **Audit the demo shop** — a realistic (fictional) store page carrying ~25 seeded failures across 21 rules — or paste any URL. Requires Node 20+. No environment variables, no `.env`, no configuration.

## Why it's different

Most accessibility tools hand you a score and a list. Fovea's bet is that the missing piece is **experience**:

| | Static report tools | Fovea |
|---|---|---|
| Where findings live | A list of selectors | Stamped on the actual pixels, with the score attached |
| Contrast math | Heuristic on raw HTML | Real `getComputedStyle()` values, ancestor alpha-compositing, honest "manual check" for gradients |
| Understanding the user | Imagination | Simulation modes + tab path + reading-order transcript |
| The fix | A recommendation | Applied to the live copy; the score moves, and the diff is your record |
| Verification | — | 39 unit tests (WCAG golden values) + 13 browser end-to-end tests |

The engine is built to be *provably* right rather than impressively wrong: every rule operates on pure element snapshots, so the same code runs in the browser, in Node unit tests, and in the headless crawler.

## How it works

```
 ┌────────────────────────────────────────────────────────────────────┐
 │  URL → same-origin proxy (SSRF-guarded fetch, scripts stripped,    │
 │        assets rewritten) OR paste-HTML OR built-in demo shop       │
 └──────────────────────────────┬─────────────────────────────────────┘
                                ▼
              sandboxed iframe (allow-same-origin, no scripts)
                                ▼
   scanner.js — one DOM walk → element snapshots (tag, attrs, geometry,
                computed color styles, visibility, ancestor bg chain)
                                ▼
   ┌────────────── pure, unit-tested engine ──────────────┐
   │ rules.js (24 WCAG-aligned rules)   taborder.js       │
   │ color.js (WCAG luminance + contrast) readingorder.js │
   │ score.js (Access Score)            sim.js (matrices) │
   └──────────────────────────────────────────────────────┘
                                ▼
        X-ray overlay · simulations · keyboard path · transcript
        Live Fix Mode (sandboxed DOM edit → re-scan → score delta)
                                ▼
     bin/crawl.js — the same scan headlessly across real homepages
        → data/corpus/summary.json → the corpus report page
```

**The Access Score** starts at 100 and subtracts one weighted deduction per rule with open violations — severity (critical 6 · serious 3 · moderate 1.2 · minor 0.4) × scope (page-wide ×1.5 · interactive ×1.1 · content ×1/×0.7), first instance at half weight. It's a deterministic triage signal, not a certification, and the ⓘ button in the app explains every term.

## What Fovea does *not* do (honesty box)

- It audits **static markup and computed styles**. Scripts are stripped from audited pages, so client-side-rendered app states are out of scope (the proxy tells you when a site degrades — paste-HTML mode is the fallback).
- The disability simulations are **awareness approximations**, not clinical tools; the transcript is a reading-order estimate, not a screen reader.
- Live Fix Mode edits the **in-memory copy** to demonstrate the fix and move the score; the copy-paste snippets are what you apply to real code.
- It does not certify WCAG conformance — it catches a meaningful, well-defined slice (~24 rules) and says exactly which ones in the app's About panel.

## Development

```bash
npm install
npm start              # run the app
npm test               # 39 engine unit tests (node:test, no browser needed)
npm run test:e2e       # 13 Playwright end-to-end specs (needs: npx playwright install chromium)
npm run crawl          # rebuild the web corpus report (same requirement)
```

Project layout: `src/engine/` (pure audit engine), `src/` (app pages), `lib/proxy.js` (same-origin proxy), `demo/` (NovaMart demo shop), `bin/crawl.js` (pipeline), `data/corpus/` (committed results), `tests/` (unit + e2e). Design decisions and deliberate limitations are documented in [DECISIONS.md](DECISIONS.md); dependency licenses in [CREDITS.md](CREDITS.md).

## How AI was used

Fovea was built during Next Byte Hacks V5 with AI coding agents (architecture specified by the team, every file reviewed and tested before landing). All rule logic, color math, scoring and UI are original work — verified against published WCAG formulas and unit-tested golden values, with the color-vision matrices from the standard Machado, Oliveira & Fernandes (2009) model cited in `src/engine/sim.js`. Nothing was copied from tutorials, templates, or other projects; the full disclosure also appears in the Devpost submission.

## License

MIT — see [LICENSE](LICENSE). Built during Next Byte Hacks V5, October–November 2026.
