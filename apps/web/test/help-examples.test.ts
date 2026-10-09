/** Slice 9 · every capture example in the help runs through the shared R11 parser. */
import { parseCapture } from '@onti/shared'
import { at, TZ } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { buildHelp } from '../src/features/help/help-model'
import { messages } from '../src/messages'

const WED_0905 = at('2026-10-07 09:05')
const WED_1800 = at('2026-10-07 18:00')

interface Expected {
  title: string
  tags: string[]
  /** Local due at Wed 09:05, or minutes after now, or no reminder. */
  due: Date | { minutes: number } | null
  /** What `shows` must name: the day word and the time, or the offset. */
  shows: string[]
}

const EXPECTED: Record<string, Expected> = {
  'Call back 17:00': {
    title: 'Call back',
    tags: [],
    due: at('2026-10-07 17:00'),
    shows: ['today', '17:00', 'tomorrow'],
  },
  'Call back today 08:00': {
    title: 'Call back',
    tags: [],
    due: at('2026-10-07 08:00'),
    shows: ['today', '08:00', 'late'],
  },
  'Call back tomorrow 9:00': {
    title: 'Call back',
    tags: [],
    due: at('2026-10-08 09:00'),
    shows: ['tomorrow', '09:00'],
  },
  'Stretch +30m': { title: 'Stretch', tags: [], due: { minutes: 30 }, shows: ['30 minutes'] },
  'Review PR +2h': { title: 'Review PR', tags: [], due: { minutes: 120 }, shows: ['2 hours'] },
  'Call back #client-a': {
    title: 'Call back',
    tags: ['client-a'],
    due: null,
    shows: ['client-a', 'no reminder'],
  },
  'Buy milk': { title: 'Buy milk', tags: [], due: null, shows: ['no reminder'] },
}

const examples = messages.help.examples

describe('help capture examples', () => {
  it('has an expectation for every example, and no expectation without an example', () => {
    expect(examples.map((e) => e.input).sort()).toEqual(Object.keys(EXPECTED).sort())
  })

  it.each(examples.map((e) => [e.input, e.shows] as const))(
    '%s parses as the help says at Wed 09:05',
    (input, shows) => {
      const expected = EXPECTED[input]!
      const result = parseCapture(input, WED_0905, TZ)
      expect(result.title).toBe(expected.title)
      expect(result.tags.map((t) => t.slug)).toEqual(expected.tags)
      const due = expected.due
      if (due === null) expect(result.dueAt).toBeNull()
      else if (due instanceof Date) expect(result.dueAt).toEqual(due)
      else expect(result.dueAt).toEqual(new Date(WED_0905.getTime() + due.minutes * 60_000))
      for (const word of expected.shows) expect(shows).toContain(word)
    },
  )

  it('moves a past HH:MM to tomorrow, as its line says', () => {
    expect(parseCapture('Call back 17:00', WED_1800, TZ).dueAt).toEqual(at('2026-10-08 17:00'))
  })

  it('accepts today HH:MM even when it has passed, as its line says', () => {
    expect(parseCapture('Call back today 08:00', WED_1800, TZ).dueAt).toEqual(
      at('2026-10-07 08:00'),
    )
  })

  it('shows the examples in the capture section, desktop and touch', () => {
    for (const touch of [false, true]) {
      const capture = buildHelp(touch).find((s) => s.id === 'capture')!
      expect(capture.examples).toEqual(examples)
    }
    expect(buildHelp(false).find((s) => s.id === 'days')!.examples).toBeUndefined()
  })
})
