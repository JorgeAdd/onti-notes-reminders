import { describe, expect, it } from 'vitest'
import { NotFoundError, ValidationError } from '../src/application/errors'
import { makeSetTimezone } from '../src/application/set-timezone'
import { ANA, InMemoryProfiles, JORGE } from './fakes'

describe('setTimezone', () => {
  it('stores the zone while the profile is still on UTC and returns it', async () => {
    const profiles = InMemoryProfiles.of({ [JORGE.userId]: 'UTC' })
    const result = await makeSetTimezone(profiles)(JORGE, 'America/Mexico_City')
    expect(result).toBe('America/Mexico_City')
    expect(profiles.writes).toEqual([{ userId: JORGE.userId, timezone: 'America/Mexico_City' }])
  })

  it('is a no-op that returns the stored zone when the profile is not on UTC', async () => {
    const profiles = InMemoryProfiles.of({ [JORGE.userId]: 'America/New_York' })
    const result = await makeSetTimezone(profiles)(JORGE, 'Asia/Kolkata')
    expect(result).toBe('America/New_York')
    expect(profiles.writes).toEqual([])
  })

  it('a repeat call after a successful one is a no-op, not an error', async () => {
    const profiles = InMemoryProfiles.of({ [JORGE.userId]: 'UTC' })
    const setTimezone = makeSetTimezone(profiles)
    await setTimezone(JORGE, 'America/Mexico_City')
    expect(await setTimezone(JORGE, 'America/Mexico_City')).toBe('America/Mexico_City')
    expect(profiles.writes).toHaveLength(1)
  })

  it.each(['Mars/Olympus', '', '   '])(
    'rejects the invalid zone %j without writing',
    async (zone) => {
      const profiles = InMemoryProfiles.of({ [JORGE.userId]: 'UTC' })
      await expect(makeSetTimezone(profiles)(JORGE, zone)).rejects.toBeInstanceOf(ValidationError)
      expect(profiles.writes).toEqual([])
    },
  )

  it('rejects a missing profile row with NotFoundError', async () => {
    const profiles = InMemoryProfiles.of({ [ANA.userId]: 'UTC' })
    await expect(makeSetTimezone(profiles)(JORGE, 'America/Mexico_City')).rejects.toBeInstanceOf(
      NotFoundError,
    )
  })
})
