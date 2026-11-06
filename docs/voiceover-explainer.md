# FOVEA — Demo Film Voiceover — Conversion — 2:47

## Assumptions Flagged (SaaS Explainer Video Architect, Section 2)
- **Objective locked: CONVERSION.** Audience = hackathon judges + developers evaluating on Devpost. Runtime fixed by pre-shot footage: 166.7 s. Platform: Devpost + YouTube.
- **Blueprint: Snowball (Airtable pattern).** Capability-rich product, polished UI, single-tool audience → committee logic (Category Pitch) is overkill. Rationale one-liner per Section 4.
- **Hard constraint:** the video is already shot. Every line below is mapped to the *actual* beat table in `docs/demo-script.md` (authoritative timings in `scripts/record-demo.js`). No line describes footage that does not exist (verified against the beat map: no corpus batch, no screen-reader segment in the tape).
- VO pace ≈ 126 wpm (350 words / 167 s) — leaves air for on-screen action; numbers are written out for clean TTS pronunciation.

## Script (timed to the recorded tape)

| Time | Visual (footage) | VO | Psychological function |
|------|------------------|----|------------------------|
| 0:00–0:11 | Home page; cursor clicks "Audit the demo shop"; scan completes | Ninety-five point nine percent of the top million websites fail accessibility. And almost nobody sees it coming, because the failures are invisible. This is Fovea: the accessibility X-ray. | Reality anchor + anti-position (pain before product) |
| 0:11–0:21 | X-ray: 42 chips stamp onto live elements; score counts down to 66, Grade C | Watch: forty-two violations stamp onto the exact elements that cause them. One number sums up the damage: the Access Score drops to sixty-six. | 10-second proof (input→output before 0:21) |
| 0:21–0:43 | Cursor walks the stamps: unlabeled search, unnamed cart, Help new-window, unreachable deal card | Every chip is a real element, checked with real browser styles. No guessing. A search field with no label: screen reader users type into silence. A cart button with no name. A Help link that opens a new window without warning. A deal that the keyboard can never reach. | Snowball demo micro-loop; specificity engine |
| 0:43–1:09 | Simulations: protanopia → low-vision tunnel → keyboard-only (tabindex=5 jumps to stop #1) | But the fastest way to understand this is to become the user. Protanopia: the red badge melts into the green banner. Low vision: the page collapses into a tunnel of blur. Keyboard only: everything dims except the tab path, and the tabindex hack jumps to stop number one, breaking the order. Over a billion people live this every day. | Escalation; outcome ladder; audience stake |
| 1:09–1:19 | Score popover opened, closed | The score is not a guess either. It is a weighted model, and every deduction traces back to a rule and an element. | Credibility beat |
| 1:19–1:41 | URL bar: types debian.org → same-origin proxy fetches, strips scripts, audits live | And it is not just our demo. Paste any URL, and Fovea fetches the real page through a same-origin proxy, strips every script, renders it, and audits it live. This is debian dot org. A real production website, being X-rayed right now. | Differentiator act (works on the real web) |
| 1:41–1:53 | Walk debian.org result, source badge | Same rules, same math, on a site nobody scripted in advance. That is how you know the engine is honest. | Trust beat |
| 1:53–1:59 | New audit → demo shop, fresh session, score 66 | Back to the demo shop. Fresh session. Still sixty-six. Now watch. | Setup for payoff (Chekhov's gun) |
| 1:59–2:33 | Live Fix Mode, four rule clicks, score climbs 66→~80, fixed rows accumulate | This is Live Fix Mode. One click per rule. Add the label. Name the button. Name the image. Fix the contrast. No reload, no external service. The page changes and re-scans instantly, and the score climbs with every click. Sixty-six. Eighty. Each repaired rule earns a copy-paste snippet for your real codebase, so the fix reaches production, not just this demo. | Dopamine payoff + outcome ladder |
| 2:33–2:47 | Page-level fixes → score 89; closing frame over the dial | Page-level fixes land last: language, title, pinch to zoom. Eighty-nine. One tool took this page from invisible to undeniable in under three minutes. Code and repo below. | Binary tagline close |

## Quality Gate Results (Conversion gates, Section 9)

| Gate | Result | Note |
|------|--------|------|
| Competitor Swap Test | PASS | "Stamps onto the exact elements", "score climbs with every click", "same-origin proxy strips scripts" — mechanics-bound, not swappable |
| Demo Density | PASS | Footage is ~100% real UI |
| Pain Before Product | PASS* | Name lands at ~0:10 (6% of runtime); earlier than the 10–20% band — accepted: Snowball's 10-second proof takes priority and the footage opens on product. Flagged, not silent. |
| Data Realism | PASS | 42 chips, 66/80/89, tabindex=5, debian.org — every number exists in the tape |
| Outcome Ladder | PASS | Every feature line ends on a user outcome (silence, barrier, production fix), never a capability |
| Three-Audience Test | PASS | Developers (copy-paste snippet, codebase), managers (traceable score), execs (a billion people) |
| 10-Second Rule (pacing) | PASS | 10 beats; something new every ~10–25 s, flatline-free |

## Portfolio (Section 11, derived from the same narrative)
- Hook (15–30s): the stamp moment + score drop — see `voiceover-social.md`.
- Conversion (60–120s): this script (master narrative, 2:47).
- Brand (90–180s): not produced — footage-bound; premise would be the simulation sequence with category close ("the web, seen by everyone").

## TTS-ready narration (copy-paste; numbers spelled out)
See `voiceover-explainer-tts.txt`.
