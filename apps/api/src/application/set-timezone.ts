import { isValidTimeZone } from '@onti/shared'
import type { Identity } from '../domain/identity'
import { NotFoundError, ValidationError } from './errors'
import type { ProfileRepository } from './ports'

/** Stores the browser zone once, while the profile is still on UTC; repeats return the stored zone. */
export function makeSetTimezone(profiles: ProfileRepository) {
  return async function setTimezone(identity: Identity, timezone: string): Promise<string> {
    if (!isValidTimeZone(timezone)) throw new ValidationError('Unknown timezone')
    const stored = await profiles.setTimezoneIfDefault(identity, timezone)
    if (stored === null) throw new NotFoundError('Profile not found')
    return stored
  }
}

export type SetTimezone = ReturnType<typeof makeSetTimezone>
