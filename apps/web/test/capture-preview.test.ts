import { at, TZ } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { previewCapture } from '../src/features/today/capture-preview'
import { messages } from '../src/messages'

const NOW = at('2026-10-06 11:12') // C1: Tue 6 11:12

describe('previewCapture · what the bar shows before ↵ (C1, R11)', () => {
  it('C1: tag, "today 17:00" and the time left, from the shared parse', () => {
    const result = previewCapture(
      'Notify Ana: move repo permissions from me to Luis #client-a 17:00',
      NOW,
      TZ,
    )

    expect(result).toMatchObject({
      kind: 'ok',
      text: '→ Client A · today 17:00 · in 5h48',
      capture: {
        title: 'Notify Ana: move repo permissions from me to Luis',
        tags: [{ slug: 'client-a', name: 'Client A' }],
        dueAt: at('2026-10-06 17:00'),
      },
    })
  })

  it('a capture without a time is a plain note', () => {
    expect(previewCapture('Call back', NOW, TZ)).toMatchObject({
      kind: 'ok',
      text: '→ note, no reminder',
      capture: { title: 'Call back', tags: [], dueAt: null },
    })
    expect(previewCapture('Call back #client-a #infra', NOW, TZ)).toMatchObject({
      kind: 'ok',
      text: '→ Client A, Infra · note, no reminder',
    })
  })

  it('names tomorrow, other days by weekday, and a time already past as late', () => {
    expect(previewCapture('Standup tomorrow 9:00', NOW, TZ)).toMatchObject({
      text: '→ tomorrow 09:00 · in 21h48',
    })
    expect(previewCapture('Review +72h', NOW, TZ)).toMatchObject({
      text: '→ Fri 11:12 · in 72 h',
    })
    expect(previewCapture('Review today 09:00', NOW, TZ)).toMatchObject({
      text: '→ today 09:00 · late 2h12',
    })
  })

  it('has no title to save when only tags and a time were typed', () => {
    expect(previewCapture('', NOW, TZ)).toEqual({ kind: 'empty' })
    expect(previewCapture('   #client-a 17:00', NOW, TZ)).toEqual({ kind: 'empty' })
  })

  it('flags a title over 200 characters and still accepts exactly 200', () => {
    expect(previewCapture('x'.repeat(201), NOW, TZ)).toEqual({ kind: 'tooLong' })
    expect(previewCapture('x'.repeat(200), NOW, TZ)).toMatchObject({ kind: 'ok' })
  })

  it('keeps the words in the messages module', () => {
    expect(messages.capture.noReminder).toBe('note, no reminder')
  })
})
