# 21 — Slice 6 PR3: web push in the browser

**Intent:** build slice 6 PR3 (service worker, manifest and icons, the opt-in
notification control, the guarded open-the-app fallback, sign-out
unsubscribe), verify it and fix what verify found before the PR.
**Outcome:** 6 commits with strict TDD, web tests 611 → 693, verify PASS
WITH WARNINGS (0 critical). After verify: SG14 now says the phone bar holds
the notification control and wraps on narrow phones; the bridge's
no-mutation tests wait for a macrotask (proven by breaking the due_at guard).
`apps/web/.env.example` could not be edited (deny rule on `.env*`); the
`VITE_VAPID_PUBLIC_KEY=` line is left to the human.

## Prompts

> Do it (push the slice 4 archive)

> Do it (run sdd-verify on PR3)
