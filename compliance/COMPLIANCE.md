# COMPLIANCE.md — Next Byte Hacks V5 rules audit (self-audit, 2026-11-05)

Every check below was actually run in the sandbox; evidence in `compliance/evidence.txt`.

| Rule | Status | Evidence |
|---|---|---|
| Project created during event (Oct 6 – Nov 7, 2026 5pm EST) | PASS | First commit `2026-11-05T20:40:49Z` (git log, compliance/evidence.txt). Window verified from the official event page (deadline "Nov 7, 2026 @ 5:00pm EST" scraped from next-byte-hacks-v5.devpost.com on 2026-11-05; raw HTML saved at refs/nbh5_page.html in the workspace). Note: the user's EVENT_WINDOW.txt was missing; the official page was used as the authoritative source (documented in DECISIONS.md of the workspace and EVENT_WINDOW.txt). |
| No reused / previously submitted work | PASS | Brand-new repo initialized 2026-11-05; no history before first commit; no code copied from the workspace tooling or past projects. |
| Submission completeness: title, description, technologies, screenshots, video, repo | PASS (2 manual steps) | devpost.md, submission/screenshots/ (5), demo_raw.mp4; GitHub push + Devpost form = the user's manual steps (CHECKLIST.md). |
| Demo video 2–5 min (and page's 1–3 min) | PASS | ffprobe: 166.73 s, 1920×1080, 30 fps. |
| Video explains what / how / problem | PASS (pending voiceover) | docs/demo-script.md maps beats (a)(b)(c); raw take is silent by design — user must add voiceover.txt or captions before uploading (flagged in CHECKLIST.md). |
| No faked features on camera | PASS | Every number in the tape is produced live (rehearsal replaced gnu.org with debian.org after a real proxy failure; score arc 66→89 is the app's real output). |
| No paid API keys / runs local | PASS | Runtime deps: express only (npm ls in compliance/licenses.txt). No .env files (find = 0). No network calls beyond audited pages. |
| No secrets committed | PASS | grep scan: only false positives (a JS variable named `token`, the phrase "autocomplete token"); no .env, no keys, no tokens (evidence.txt). |
| Licensing | PASS | express MIT, @playwright/test Apache-2.0 (compliance/licenses.txt); CREDITS.md lists all + scientific sources; MIT project license. |
| No plagiarized code | PASS | Core logic written fresh this session; formulas cited from published sources (WCAG, Machado 2009) and unit-tested; no tutorial/repo code reproduced. |
| AI-generated code disclosure | PASS | README §How AI was used + devpost.md §How AI was used, honest statement. |
| Safety: no harmful content, no real personal data | PASS | Demo shop is fictional (fake brand/products); corpus stores per-page audit results only (no page copies, no personal data); proxy blocks private addresses (SSRF guard, e2e-tested). |
| No duplicate submission | PASS | This project is for Next Byte Hacks V5 only. |

## Rubric map (25% each)
- **Innovation & Creativity**: X-ray overlay on live elements + disability simulations + live-fix actuator; no Devpost project in the 15-project reference dossier combines these (refs/REFERENCE_DOSSIER.md).
- **Technical Complexity**: real-browser computed-style auditing, WCAG color math with alpha compositing, tab-order semantics, same-origin proxy with SSRF guard, headless 50-site pipeline, 39 unit + 13 e2e tests.
- **Functionality & Execution**: verified by 13 Playwright specs + clean-clone run + the demo tape itself.
- **Presentation & Clarity**: 2:47 narrated demo (script+voiceover ready), 5 screenshots, hooked README first screen.

**Open items (all user-side):** GitHub push, voiceover recording, Devpost form, team info.
