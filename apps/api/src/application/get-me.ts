import type { MeResponse } from '@onti/shared'
import type { Identity } from '../domain/identity'
import type { ProfileRepository } from './ports'

const FALLBACK_TIMEZONE = 'UTC'

export function makeGetMe(profiles: ProfileRepository) {
  return async function getMe(identity: Identity): Promise<MeResponse> {
    const profile = await profiles.findOwn(identity)
    return {
      userId: identity.userId,
      email: identity.email,
      timezone: profile?.timezone ?? FALLBACK_TIMEZONE,
    }
  }
}

export type GetMe = ReturnType<typeof makeGetMe>
