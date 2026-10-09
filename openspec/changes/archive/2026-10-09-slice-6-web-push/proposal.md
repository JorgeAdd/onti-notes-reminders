# Proposal: Slice 6 — Web Push notifications

## Intent

Deliver R10: one push per `due_at` value, with Done and "+1 h" actions (SG17, R7, R9, C2, C3, C5, C7, C15) that work with the app closed. Today the DB columns exist (`notified_due_at`, `push_subscriptions`) but nothing sends. Decisions: ADR-002 (scheduler in the API process), ADR-004 (signed action token, exception in CLAUDE.md rule 18), `docs/roadmap.md` Slice 6. Cited, not restated.

## Scope

### In Scope

- Scheduler: 30 s tick, injectable timer, claim-then-send (at-most-once) with `FOR UPDATE SKIP LOCKED`; claim marks reminders even without subscriptions.
- Backfill migration (before the scheduler starts) plus `docs/db/schema.md`.
- `web-push` sender: 404/410 prunes, other errors count failures. Body = first 2 non-empty lines (<= 120 chars, markdown stripped) plus tag name.
- Subscription endpoints (every device); action endpoints `POST /push-actions/{done|snooze}` with token sign/verify.
- Web: plain `public/sw.js`, manifest, placeholder icons, registration, permission control, sign-out unsubscribe, `vercel.json` no-cache for `/sw.js`.

### Out of Scope

Cross-device dismiss; rich iOS support (best effort); retries or at-least-once delivery; notification history; non-VAPID push.

## Capabilities

### New Capabilities

- `push-scheduler`: claim, dispatch, past-time capture within 30 s, backfill, all-or-none config.
- `push-subscriptions`: subscribe, unsubscribe, prune, sign-out.
- `push-actions`: token, Done and +1 h endpoints, open-the-app fallback.
- `notification-permission`: opt-in control states, never on load, denied copy.

### Modified Capabilities

- `reminder-actions`: +1 h from a notification (C15).

## Approach

Hexagonal: new ports in `application/push-ports.ts`, dispatch use case with fake claimer, sender and `FakeClock`; adapters in infrastructure. Scheduler starts only when VAPID config is complete. Strict TDD, no real network. Ships as three PRs, each labelled `size:exception` (human decision: fewer, larger PRs; `delivery_strategy: exception-ok`, no chaining):

1. **PR1 backend core + runtime + token codec** (design slices 1a and 1b, about 1,370 changed lines including tests): shared push schemas, ports, claim, dispatch, payload, `WebPushSender`, scheduler, config, HMAC token codec, backfill migration plus `docs/db/schema.md`.
2. **PR2 subscription and action endpoints** (about 665): subscribe (with the owner-role reassignment of the ADR-001 amendment), unsubscribe, `POST /push-actions/{done|snooze}` with `401`/`404`/`409` per ADR-004 decision 6, C15 proof.
3. **PR3 web** (design slices 3a and 3b, about 1,080): `sw.js`, manifest, icons, registration, permission control, guarded fallback bridge (ADR-004 decision 5), sign-out unsubscribe, `vercel.json`. Merges after slice 4 is merged.

Accepted defaults: the permission control gets a mobile bar slot, checked manually at 375 px, with the date column as the phone fallback; sign-out waits at most 2 s, only when this browser is subscribed (a noted exception in the `App.tsx` comment); manifest colors are raw hex with a parity test against the light-mode tokens (a narrow rule 8 exception); the backfill migration is applied before the Railway deploy that sets the VAPID config.

Merge order: slice 4 PR1 first (shared note wire type); slice 6 PR1/PR2 any time after; PR3 after slice 4 merges. Ownership: slice 6 stays in new files, optional `push?` in `ServerDeps`, `notifications` key appended in `messages.ts`; reuse slice 4's markdown-to-plain-text helper if merged, else a minimal local one.

## Affected Areas

| Area                                                               | Impact  | Description                       |
| ------------------------------------------------------------------ | ------- | --------------------------------- |
| `apps/api/src/application/push-*`                                  | New     | ports, claim, dispatch, token     |
| `apps/api/src/infrastructure`                                      | New/Mod | sender, scheduler, routes, config |
| `supabase/migrations`, `docs/db/schema.md`                         | New/Mod | backfill                          |
| `packages/shared/src/push.ts`                                      | New     | payload schemas                   |
| `apps/web/public`, `features/push/*`, `messages.ts`, `vercel.json` | New/Mod | PR3                               |

## Risks

| Risk                                | Likelihood | Mitigation                                                          |
| ----------------------------------- | ---------- | ------------------------------------------------------------------- |
| At-most-once loss on crash          | Med        | Accepted; Today still lists the item (C7)                           |
| Secret leak or rotation             | Med        | Env only; rotation invalidates subscriptions and tokens, documented |
| iOS limits                          | High       | Best effort; feature-detect actions                                 |
| Stale `sw.js`                       | Med        | no-cache header, `skipWaiting`, `update()`                          |
| `web-push` CJS under tsup           | Med        | Build check in PR1                                                  |
| CI cannot prove real delivery       | High       | Manual post-deploy check                                            |
| CONTRACT tail conflict with slice 4 | Med        | Rebase; small docs commits                                          |

## Rollback Plan

Remove the VAPID config and the scheduler stays off. Otherwise revert the PRs; the backfill only set `notified_due_at`, so no data repair is needed.

## Dependencies

Human-only: VAPID keys, Railway and Vercel env vars (names in `docs/roadmap.md`), single non-sleeping Railway instance, backfill migration applied to Supabase before the Railway deploy that sets the VAPID config. Docs first: ADR-001 amendment (subscribe reassignment) and ADR-004 fallback guard and error codes (committed). Slice 4 merged before PR3.

## Success Criteria

- [ ] One push per `due_at`; re-armed on change (C2, C5); done items skipped.
- [ ] No burst on first deploy; no prompt on load.
- [ ] Done and +1 h work from a closed app; the fallback opens the app and acts only if Today still shows the same `due_at`.
- [ ] `npm run verify` and "Verify and build" green per PR.
