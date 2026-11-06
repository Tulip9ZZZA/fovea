# CHECKLIST.md — every Devpost/rules requirement → its file

| Requirement (source) | Status | Where |
|---|---|---|
| New project built during event (Oct 6 – Nov 7, 2026) | ✅ | repo git history: first commit 2026-11-05T20:40Z; window verified from official Devpost page (see compliance/COMPLIANCE.md) |
| Project title | ✅ | devpost.md §Title |
| Project description (what/problem/features) | ✅ | devpost.md §Description |
| Technologies used list | ✅ | devpost.md §Technologies used |
| Screenshots / images (4-5) | ✅ | submission/screenshots/ (5 PNGs, also in repo docs/) |
| Demo video 2–5 min (page says 1–3 min) — we ship 2:47, satisfying both | ✅ | submission/demo_raw.mp4 (166.7 s, 1920×1080, 30 fps, ffprobe-verified) |
| Video clearly explains what / how / problem | ✅ script ready | docs/demo-script.md (beats a/b/c mapped) + docs/voiceover-explainer.md (SaaS-explainer script, gate-tested, mapped to the real footage beat table) + docs/voiceover-explainer-tts.txt (TTS-ready) |
| **⚠ Video must carry the voiceover or captions when uploaded** — the raw take is silent | ⚠ MANUAL | record submission/voiceover-explainer-tts.txt over demo_raw.mp4 (see manual steps) |
| GitHub repo link with accessible source code | ⚠ MANUAL | repo is in submission/fovea-repo.zip (with full git history); create the public GitHub repo and push |
| Setup works from a clean clone in ≤3 commands | ✅ verified (Node 24) | README §Try it; `npm install && npm start` — re-verified from the zip on Node v24: install OK, `npm test` 39/39 pass (test-script glob fixed for Node ≥22), server HTTP 200 |
| No paid API keys; runs offline/local | ✅ | zero runtime deps beyond express; no env vars, no .env |
| No secrets committed | ✅ | compliance/COMPLIANCE.md (grep evidence) |
| Licensing: all dependencies permissive + listed | ✅ | CREDITS.md + compliance/licenses.txt |
| No plagiarized code; core logic fresh | ✅ | DECISIONS.md §originality; CREDITS.md cites formulas, not code |
| AI-generated code disclosure | ✅ | README §How AI was used + devpost.md §How AI was used |
| No harmful/unsafe content; fake data only in demo | ✅ | demo/novamart.html is fictional; corpus stores audit results only |
| Judging rubric: Innovation / Technical complexity / Functionality / Presentation | ✅ targeted | see compliance/COMPLIANCE.md §rubric-map |
| Devpost form: team info, images upload, video upload, repo link | ⚠ MANUAL | the four manual steps in the final reply |

Manual steps left (also in the final reply):
1. Create the public GitHub repo, unzip submission/fovea-repo.zip, `git push`.
2. Record your voice reading submission/voiceover-explainer-tts.txt over submission/demo_raw.mp4 (2:47), or add captions; upload.
3. Paste devpost.md into the Devpost form; upload the 5 screenshots.
4. Fill in team info (1–4 real members).
