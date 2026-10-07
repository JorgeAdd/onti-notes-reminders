import type { MeResponse } from '@onti/shared'
import type { Identity } from '../domain/identity'
import type { ProfileRepository } from './ports'
import { resolveTimezone } from './timezone'

export function makeGetMe(profiles: ProfileRepository) {
  return async function getMe(identity: Identity): Promise<MeResponse> {
    const profile = await profiles.findOwn(identity)
    return {
      userId: identity.userId,
      email: identity.email,
      timezone: resolveTimezone(profile),
    }
  }
}

export type GetMe = ReturnType<typeof makeGetMe>
