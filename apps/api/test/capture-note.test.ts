import { buildDayPage, parseCapture, type TodayResponse } from '@onti/shared'
import { at, BEFORE_CAPTURE, N1, TZ } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { makeCaptureNote } from '../src/application/capture-note'
import { makeGetToday } from '../src/application/get-today'
import { InMemoryNotes, JORGE, noteRecord, profileReturning } from './fakes'

describe('captureNote', () => {
  it('derives the tag names from the slugs (R11) and keeps the title', async () => {
    const notes = new InMemoryNotes()
    const note = await makeCaptureNote({ notes })(JORGE, {
      title: 'Buy cable',
      tags: ['home', 'client-a'],
      dueAt: null,
    })
    expect(note.title).toBe('Buy cable')
    expect(note.tags).toEqual([
      { slug: 'home', name: 'Home' },
      { slug: 'client-a', name: 'Client A' },
    ])
  })

  it('writes each slug once even if a caller repeats it', async () => {
    const notes = new InMemoryNotes()
    await makeCaptureNote({ notes })(JORGE, {
      title: 'Call back',
      tags: ['client-a', 'client-a', 'home'],
      dueAt: null,
    })
    expect(notes.created[0]?.input.tags.map((tag) => tag.slug)).toEqual(['client-a', 'home'])
  })

  it('a timed note has due_at = original_due_at and snooze_count 0', async () => {
    const due = at('2026-10-06 17:00')
    const note = await makeCaptureNote({ notes: new InMemoryNotes() })(JORGE, {
      title: 'Call back',
      tags: [],
      dueAt: due,
    })
    expect(note.dueAt).toEqual(due)
    expect(note.originalDueAt).toEqual(due)
    expect(note.snoozeCount).toBe(0)
    expect(note.doneAt).toBeNull()
  })

  it('a note without a time has no reminder at all (both dates null)', async () => {
    const note = await makeCaptureNote({ notes: new InMemoryNotes() })(JORGE, {
      title: 'Buy cable',
      tags: [],
      dueAt: null,
    })
    expect(note.dueAt).toBeNull()
    expect(note.originalDueAt).toBeNull()
    expect(note.snoozeCount).toBe(0)
  })

  it('stores the note for the caller only', async () => {
    const notes = new InMemoryNotes()
    await makeCaptureNote({ notes })(JORGE, { title: 'Call back', tags: [], dueAt: null })
    expect(notes.created.map((c) => c.ownerId)).toEqual([JORGE.userId])
  })

  it('C1 · what the preview parses is what is saved: 3 items, 12 other notes', async () => {
    const now = at('2026-10-06 11:12')
    const parsed = parseCapture(
      '#client-a 17:00 Notify Ana: move repo permissions from me to Luis',
      now,
      TZ,
    )
    const notes = new InMemoryNotes(
      BEFORE_CAPTURE.map((fixture, index) => ({
        ownerId: JORGE.userId,
        note: noteRecord(index + 1, {
          title: fixture.title,
          dueAt: fixture.dueAt,
          originalDueAt: fixture.originalDueAt,
        }),
      })),
    )

    const saved = await makeCaptureNote({ notes })(JORGE, {
      title: parsed.title,
      tags: parsed.tags.map((tag) => tag.slug),
      dueAt: parsed.dueAt,
    })

    expect(saved.title).toBe(N1.title)
    expect(saved.tags).toEqual([{ slug: 'client-a', name: 'Client A' }])
    expect(saved.dueAt).toEqual(at('2026-10-06 17:00'))
    expect(saved.originalDueAt).toEqual(saved.dueAt)

    const page: TodayResponse = await makeGetToday({
      clock: { now: () => now },
      notes,
      profiles: profileReturning({ timezone: TZ }),
    })(JORGE)
    const expected = buildDayPage([...BEFORE_CAPTURE, N1], now, TZ)
    expect(page.openCount).toBe(3)
    expect(page.otherCount).toBe(12)
    expect(page.rail.map((item) => item.title)).toEqual(expected.rail.map((n) => n.title))
  })
})
