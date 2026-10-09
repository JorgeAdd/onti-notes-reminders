# 22 — Archive slice 6

**Intent:** after #24 (slice 6 web) and #23 (slice 4 archive) merged,
archive slice 6 with its human setup and manual smokes recorded as pending,
then retire the `slice-6` worktree.
**Outcome:** slice 6 archived at
`openspec/changes/archive/2026-10-09-slice-6-web-push/`; main specs gained
push-scheduler, push-subscriptions, push-actions and notification-permission;
reminder-actions gained C15. The archive report states at the top that push
is not live yet and lists the human steps in order (VAPID keys, backfill
migration before the Railway VAPID deploy, Railway and Vercel variables,
`.env.example` line, manual smokes).

## Prompts

> Yes (push slice 6 PR3)

> 24 is merged

> 23 is merged

> Do it
