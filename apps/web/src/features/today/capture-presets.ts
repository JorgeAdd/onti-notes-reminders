import { localTimeOn } from '@onti/shared'
import { messages } from '../../messages'

export interface CapturePreset {
  /** The text the bar parses: inserted into the draft, never sent as is. */
  token: string
  label: string
}

/** Decision 16 (unconfirmed default): the "today 17:00" preset only shows while 17:00 is ahead. */
const TODAY_PRESET_HOUR = 17

/**
 * SG14 · the mobile preset row: time tokens, then one `#slug` chip per tag on the page. Each
 * preset inserts text the shared parser already understands (R11); nothing else is new.
 */
export function capturePresets(now: Date, timeZone: string, tagSlugs: string[]): CapturePreset[] {
  const todayAhead = localTimeOn(now, timeZone, 0, TODAY_PRESET_HOUR, 0) > now
  return [
    ...(todayAhead
      ? [{ token: `today ${TODAY_PRESET_HOUR}:00`, label: messages.capture.presets.today }]
      : []),
    { token: '+1h', label: messages.capture.presets.hour },
    { token: 'tomorrow 9:00', label: messages.capture.presets.tomorrow },
    ...tagSlugs.map((slug) => ({ token: `#${slug}`, label: `#${slug}` })),
  ]
}
