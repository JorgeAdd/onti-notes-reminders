/** R11 limits, shared so the command bar preview and the API validate the same numbers. */
export const CAPTURE_LIMITS = {
  titleMax: 200,
  tagsMax: 10,
  /** Keeps `tagNameFromSlug` within the `tags.name` column (1-40 characters). */
  slugMax: 40,
} as const

/** True when `value` is a timezone name the runtime knows (`Intl` only, no IO). */
export function isValidTimeZone(value: unknown): value is string {
  if (typeof value !== 'string' || value.trim() === '') return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value })
    return true
  } catch {
    return false
  }
}
