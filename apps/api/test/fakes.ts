import type { Identity } from '../src/domain/identity'
import type { Profile, ProfileRepository } from '../src/application/ports'

export const JORGE: Identity = {
  userId: '7b0c5a2e-3f4d-4c1a-9e8b-2d6f0a1b3c4d',
  email: 'jorge@example.com',
  claims: {},
}

export const ANA: Identity = {
  userId: '1d2e3f40-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  email: 'ana@example.com',
  claims: {},
}

/** Owner-scoped like RLS: a caller only reaches their own profile row. */
export class InMemoryProfiles implements ProfileRepository {
  readonly writes: { userId: string; timezone: string }[] = []

  constructor(private readonly rows = new Map<string, Profile>()) {}

  static of(entries: Record<string, string>): InMemoryProfiles {
    return new InMemoryProfiles(
      new Map(Object.entries(entries).map(([userId, timezone]) => [userId, { timezone }])),
    )
  }

  findOwn(identity: Identity): Promise<Profile | null> {
    return Promise.resolve(this.rows.get(identity.userId) ?? null)
  }

  /** Mirrors `update … where timezone = 'UTC'`: only a default profile changes. */
  setTimezoneIfDefault(identity: Identity, timezone: string): Promise<string | null> {
    const row = this.rows.get(identity.userId)
    if (!row) return Promise.resolve(null)
    if (row.timezone === 'UTC') {
      row.timezone = timezone
      this.writes.push({ userId: identity.userId, timezone })
    }
    return Promise.resolve(row.timezone)
  }
}

/** A read-only profile port that always answers `profile`; writes are never expected. */
export function profileReturning(profile: Profile | null): ProfileRepository {
  return {
    findOwn: () => Promise.resolve(profile),
    setTimezoneIfDefault: () => Promise.reject(new Error('unexpected write')),
  }
}
