# 18 — Grill the landing/welcome screen (Slice 4)

**Intent:** stress-test the design of an animated, paper-like entry screen
before planning it, covering purpose, frequency, animation concept,
duration, mobile vs desktop, reduced motion, performance budget and
CSS-only vs Motion.
**Outcome:** 4 rounds, 15 questions. Agreed: new "Slice 8 — Page
entrance" (Slice 4 stays note editing); the real page's own entrance on
every full load, interactive from the first frame, ≤ 500 ms; CSS-only,
≤ 3 kB gzipped; new SG19 easings without overshoot; SG16 reduced-motion
fade. Written to `docs/design/landing-brief.md`. The session used batched
rounds by explicit override.

## Prompt

> /grill-me
>
> Topic: the landing/welcome screen for onti-notes-reminders (Slice 4).
>
> Context you must read first (facts are your job, not mine):
> - docs/product/brief.md, docs/roadmap.md, docs/design/style-guide-decisions.md, docs/design/chosen/README.md and the design tokens used by apps/web.
> - apps/web/package.json (Vite + React 19, no animation libraries today). The production bundle is already ~569 kB and above Vite's warning.
>
> My intent: an elegant, animated entry screen that evokes notes/paper — e.g. a notebook opening or a sheet sliding in — with the same polish as my "rewards" project. In rewards, the polish comes from hand-written CSS driven by tokens, not from libraries: short durations (140/280 ms), asymmetric easing (enter cubic-bezier(.2,0,0,1), exit cubic-bezier(.4,0,1,1), overshoot cubic-bezier(.32,1.28,.56,1) for accents only), small 6–18 px rises, 50–140 ms staggers, clip-path/mask reveals, and global prefers-reduced-motion handling.
>
> Branches I expect you to cover: purpose and audience of the screen, when it shows (first visit only? every visit?), animation concept, total duration and skippability, mobile vs desktop, reduced-motion fallback, performance budget (lazy-loaded route, max added KB), CSS-only vs Motion, and how it ties to the existing style guide.
>
> Override: my global rule says one question at a time; for this session, follow the grilling skill's rounds format instead.
> When the frontier is empty, write the agreed decisions to docs/design/landing-brief.md (English) and stop.
