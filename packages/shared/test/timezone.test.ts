import { describe, expect, it } from 'vitest'
import { CAPTURE_LIMITS, isValidTimeZone } from '../src'

describe('isValidTimeZone', () => {
  it.each(['UTC', 'America/Mexico_City', 'America/New_York', 'Asia/Kolkata'])(
    'accepts the IANA zone %s',
    (zone) => {
      expect(isValidTimeZone(zone)).toBe(true)
    },
  )

  it.each(['Mars/Olympus', '', '   ', 'America/', 'not a zone'])('rejects %j', (zone) => {
    expect(isValidTimeZone(zone)).toBe(false)
  })

  it.each([undefined, null, 42, {}, ['UTC']])('rejects the non-string %j', (value) => {
    expect(isValidTimeZone(value)).toBe(false)
  })
})

describe('CAPTURE_LIMITS', () => {
  it('pins the R11 limits shared by the web and the API', () => {
    expect(CAPTURE_LIMITS).toEqual({ titleMax: 200, tagsMax: 10, slugMax: 40 })
  })
})
