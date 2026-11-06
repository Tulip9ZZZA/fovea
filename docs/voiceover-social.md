# FOVEA — Social Brag Short — Virality — 60–75s

Built with the Hook Generator + Retention Script Writer doctrines: ONE emotion per hook
(recognition/negativity), specific numbers, open loops, rehook every 15–25s, master loop
closes at the comment-CTA. TTS-ready text is in `voiceover-social-tts.txt`.

## Hook variants (grade before you ship; ship one, test another)

| # | Framework | Line | Grade |
|---|-----------|------|-------|
| V1 (shipped) | Negative warning + self-interest + specificity | "Ninety-five point nine percent of the top one million websites are failing accessibility right now. Yours is probably one of them." | Exceptional — threat + "that's me" + number |
| V2 | Result-first proof | "This score went from sixty-six to eighty-nine with one click. I built that in a hackathon, and it audits any website on earth." | Exceptional — proof-first, curiosity |
| V3 | Relatable callout | "If you have ever shipped a button a screen reader cannot name, this hackathon project is for you." | Exceptional — instant dev recognition |

## Script (retention format)

```
TITLE: I built the accessibility X-ray in one hackathon
VIEWER: a developer who ships UI fast and quietly fears their site is not accessible
MASTER LOOP: "Is YOUR site one of the 95.9%?"
TOPIC BUDGET: ~70s = 1 topic, 5 micro-beats

[0:00–0:07] IMPACT (V1 hook)
"Ninety-five point nine percent of the top one million websites are failing
accessibility right now. Yours is probably one of them. So I joined a hackathon
and built the tool that proves it in four seconds."
>> loop: MASTER OPENS — "is mine failing? what's the tool?"

[0:07–0:22] PAIN
"Here's the problem nobody talks about. Contrast bugs look fine on your monitor.
A button with no label works perfectly with a mouse. You cannot fix what you
cannot see, while a billion disabled users feel every single bug."
>> stakes + rehook planted

[0:22–0:38] TRANSFORM / PROOF 1
"So meet Fovea, the accessibility X-ray. Paste any link, and it audits the real
page and stamps every violation onto the exact element that caused it. Score:
sixty-six."
>> payoff: what the tool does (loop 2 closed)

[0:38–0:55] PROOF 2 (the wow)
"Then it shows you your users. Color blindness. Low vision. Keyboard only. And
then the part that broke my brain: one click, fix all, live re-scan. Sixty-six
to eighty-nine, on camera, with the code snippet ready to paste."
>> rehook: "broke my brain" → payoff: MASTER proof (score moves)

[0:55–1:05] SCALE
"And it does not stop at one page. I crawled fifty real homepages. Governments,
universities. Sixteen hundred violations. Seven hundred critical."
>> rehook: "governments fail too" — loop 3 closes

[1:05–1:15] PAYOFF + TAGLINE
"Fovea. From invisible to undeniable. Open source, no API keys, built in one
hackathon. Link below."
>> payoff: brand close

[1:15–1:25] CTA + NEXT LOOP
"Now drop the worst website you know in the comments, and I will X-ray it next."
>> next-video loop OPENS (comment bait = engagement flywheel)
```

## Retention map
Intensity: 8 → 5 → 7 → 9 → 7 → 8 → 9. Loops: 4 opened, all closed (master first, next-video last). Rehooks at 0:38 and 0:55.

## Production notes for your short-form shoot
- Beat 4 needs the 66→89 moment on screen: screen-record the Live Fix Mode section of the app (or reuse 0:15 of demo_raw.mp4 from 1:59–2:33).
- Beat 5 (crawl 50 homepages) is a real app feature (Batch pipeline page) — record 5–8s of it so the claim is on screen; or cut the line. Do not claim it without footage.
- Captions on, sound-off safe: every number is spoken AND shown.
- Hook variants: swap the first 7s only; everything after works with any of the three.

## TTS-ready narration
See `voiceover-social-tts.txt`.
