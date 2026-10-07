# ADR-003 — Data model and time handling

- Status: Accepted
- Date: 2026-10-06

## Context

The brief's core idea is that a note and its reminder are one object.
Snooze must keep the original due time (for v2 "missed" metrics), "today"
and "overdue" depend on the user's timezone, and the scheduler must not
send the same notification twice.

## Decision

1. **The reminder lives in the note row** (`notes.due_at`,
   `original_due_at`, `snooze_count`, `done_at`, `notified_due_at`). A note
   has zero or one reminder; a check constraint keeps the fields
   consistent (no `done_at` without `due_at`, etc.).
2. **Timestamps are `timestamptz` (UTC).** The user's IANA timezone is in
   `profiles.timezone` and is set from the browser
   (`Intl.DateTimeFormat().resolvedOptions().timeZone`) on first login.
3. **Local-day math happens in the domain layer** with an injected `Clock`
   and the profile timezone: the "today" window is
   `[local midnight, next local midnight)`, which is 23 h or 25 h long on
   DST days. Never `+ 24 h`.
4. **Notifications fire once per `due_at` value:** a reminder is due when
   `due_at <= now`, `done_at is null` and
   `notified_due_at is distinct from due_at`. After sending,
   `notified_due_at := due_at`. A snooze changes `due_at`, which re-arms it
   without extra state.
5. **Tags** are per user (`name` for display, unique `slug` for `#filter`).
   `note_tags` carries `user_id` with composite foreign keys, so a note
   cannot be tagged with another user's tag.
6. **Search** uses a stored `tsvector` (`simple` configuration, title +
   body) with a GIN index.

## Consequences

- No join to read a note with its reminder; queries for the Today page hit
  one partial index (`user_id, due_at where due_at is not null and
done_at is null`).
- `original_due_at` is only reset by a manual reschedule, never by snooze.
- Verified locally (PostgreSQL 16, Jorge's dataset): every count in the
  brief's four moments, the snooze results, the scheduler's single pick,
  RLS isolation and the DST day lengths (23 h / 25 h) match CONTRACT.md.

## Alternatives considered

- **Separate `reminders` table (1:0..1):** cleaner if notes ever had several
  reminders, but that is out of scope (no recurring reminders), and it
  adds a join to every read.
- **Store local times + timezone per reminder:** makes DST and travel
  ambiguous; UTC instants plus a profile timezone are unambiguous.
- **A boolean `notified` flag:** needs manual resets on every snooze and
  edit; comparing against `due_at` cannot drift.
