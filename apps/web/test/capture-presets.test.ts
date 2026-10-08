import { at, TZ } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { capturePresets } from '../src/features/today/capture-presets'
import { messages } from '../src/messages'

const tokens = (now: Date, tags: string[] = []) =>
  capturePresets(now, TZ, tags).map((preset) => preset.token)

describe('capturePresets · tokens the mobile bar inserts (SG14)', () => {
  it('offers today 17:00, +1h and tomorrow 9:00, then one chip per visible tag', () => {
    expect(tokens(at('2026-10-07 09:05'), ['client-a', 'infra'])).toEqual([
      'today 17:00',
      '+1h',
      'tomorrow 9:00',
      '#client-a',
      '#infra',
    ])
  })

  it('labels come from messages', () => {
    const labels = capturePresets(at('2026-10-07 09:05'), TZ, ['client-a']).map((p) => p.label)
    expect(labels).toEqual([
      messages.capture.presets.today,
      messages.capture.presets.hour,
      messages.capture.presets.tomorrow,
      '#client-a',
    ])
  })

  it('hides today 17:00 once 17:00 is no longer ahead (unconfirmed default, Decision 16)', () => {
    expect(tokens(at('2026-10-07 16:59'))).toContain('today 17:00')
    expect(tokens(at('2026-10-07 17:00'))).toEqual(['+1h', 'tomorrow 9:00'])
    expect(tokens(at('2026-10-07 21:30'))).toEqual(['+1h', 'tomorrow 9:00'])
  })
})
