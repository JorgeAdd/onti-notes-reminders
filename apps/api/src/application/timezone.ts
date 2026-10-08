import type { Profile } from './ports'

const FALLBACK_TIMEZONE = 'UTC'

/** Profile timezone, or UTC while the profile row is missing. */
export function resolveTimezone(profile: Profile | null): string {
  return profile?.timezone ?? FALLBACK_TIMEZONE
}
