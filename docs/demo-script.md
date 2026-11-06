# Fovea demo script — 2:47 recording (raw, silent; narrated from voiceover.txt)

Recording: Playwright · 1920×1080 · visible cursor overlay · no errors · no dead time.
Every beat maps 1:1 to a narration line in `voiceover.txt`. All numbers on screen are
produced live by the app — nothing is mocked, nothing is faked. Authoritative timings
are the constants in `scripts/record-demo.js`; final tape length verified by ffprobe.

Compliance coverage of "what it does / how it works / the problem it solves":
- (a) WHAT → beats 1–3 (X-ray, violations, score)
- (b) HOW → beats 6–7 (sandboxed render → snapshots → rules → score; same-origin proxy)
- (c) PROBLEM → beats 1, 4, 9 (the stats, the simulations, the fix loop)

| # | Start | Dur  | Screen action |
|---|-------|------|---------------|
| 1 | 0:00  | 11s  | Home page. Cursor moves to and clicks "Audit the demo shop"; workspace loads; scan completes. |
| 2 | 0:11  | 10s  | X-ray button → 42 chips stamp onto the live elements; Access Score counts down to 66, Grade C. |
| 3 | 0:21  | 22s  | Cursor walks the stamps: search field (no label) → cart button (no name) → Help center (opens new window, unannounced) → "Deal of the day" card (not keyboard reachable) → banner (focusable inside aria-hidden). Sidebar items highlight in sync. |
| 4 | 0:43  | 26s  | Simulations: Protanopia (whole palette collapses) → Low vision (blur + tunnel) → Keyboard-only (page dims, numbered tab path appears; the tabindex=5 card jumps to stop #1). |
| 5 | 1:09  | 10s  | Back to X-ray. Cursor opens the ⓘ Score popover, closes it. |
| 6 | 1:19  | 22s  | URL bar: type `https://www.debian.org` → Audit URL. Same-origin proxy fetches, strips scripts, renders; the engine scans a real site, live. |
| 7 | 1:41  | 12s  | Walk the debian.org result (sidebar counts, source badge "same-origin proxy · scripts stripped"). |
| 8 | 1:53  | 6s   | "← New audit" → "Demo shop" (fresh session, score 66). |
| 9 | 1:59  | 34s  | Live Fix Mode, one rule per click: "Form field has no label (2)" → "Button has no accessible name" → "Linked image has no accessible name" → "Text contrast below WCAG AA". Score climbs 66 → ~80; ✓ fixed-live rows accumulate. |
| 10| 2:33  | 14s  | Page-level fixes: language, title, pinch-to-zoom → score 89. Closing line lands over the final dial. |

Total: 167 s (2:47) — inside the 2:30–3:00 target and both rule statements (1–3 min, 2–5 min).

Rehearsal notes (discover → rehearse → record, per the ui-demo skill):
- www.debian.org was chosen in discovery: light page, reliably proxied, violation-rich.
- Before take 1: fresh browser context, server restarted, session state cleared.
- No cut points: the tape is one continuous take; pauses are held only where narration
  needs air (max ~1.5 s), so there is no dead time to trim.
