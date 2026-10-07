const MINUTE = 60_000

/** R6 · "{m} min" under 1 h, "{h} h" on whole hours, otherwise "{h}h{mm}". Truncated. */
export function formatDuration(milliseconds: number): string {
  const totalMinutes = Math.floor(Math.abs(milliseconds) / MINUTE)
  if (totalMinutes < 60) return `${totalMinutes} min`
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return minutes === 0 ? `${hours} h` : `${hours}h${String(minutes).padStart(2, '0')}`
}

export type RelativeTime = { kind: 'in'; duration: string } | { kind: 'late'; duration: string }

/** "in 25 min" / "late 15h05". The words come from the UI messages; this returns the parts. */
export function relativeTo(dueAt: Date, now: Date): RelativeTime {
  const delta = dueAt.getTime() - now.getTime()
  return delta > 0
    ? { kind: 'in', duration: formatDuration(delta) }
    : { kind: 'late', duration: formatDuration(delta) }
}
