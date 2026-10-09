-- Backfill before the push scheduler first runs (slice 6, CONTRACT R10, ADR-004).
--
-- The scheduler picks a note when due_at <= now, done_at is null and
-- notified_due_at is distinct from due_at. No notification was ever sent, so
-- every open reminder already overdue would fire at once on the first tick.
-- Mark them as notified instead. due_at is not changed.
--
-- Apply this BEFORE the deploy that sets the VAPID configuration. The predicate
-- makes a second run a no-op.
update public.notes
set notified_due_at = due_at
where due_at is not null
  and due_at <= now()
  and done_at is null
  and notified_due_at is distinct from due_at;
