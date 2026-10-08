/**
 * Design Decision 8 · the client's optimistic patch must land where the server's next /today would.
 * Parity: apply the change with the helper, and apply it to the full note list then build the page
 * exactly as `getToday` does (buildDayPage + window); both must be equal.
 */
import { describe, expect, it } from 'vitest'
import {
  applyReminderChange,
  buildDayResponse,
  filterByTag,
  markDone,
  snoozeOneHour,
  snoozeTomorrow,
  summarizeTags,
  undoDone,
  type NoteResponse,
  type ReminderChange,
  type TodayResponse,
} from '../src'
import { at, BEFORE_CAPTURE, replace, TZ, type FixtureNote } from './fixtures/jorge-week'

const NOW = at('2026-10-07 09:05')

/** A viewed page: `date: null` is today. */
interface View {
  date: string | null
  tag: string | null
}
const TODAY: View = { date: null, tag: null }

/** The assembly `makeGetToday` performs (filter, then `buildDayResponse`), over a full note list. */
function respond(notes: FixtureNote[], view: View = TODAY, now = NOW): TodayResponse {
  const own = notes.map((n) => ({
    ...n,
    tags: n.tags.map((slug) => ({ slug, name: slug })),
  }))
  const { matching, hiddenCount } = view.tag
    ? filterByTag(own, view.tag)
    : { matching: own, hiddenCount: 0 }
  return buildDayResponse({
    notes: matching,
    now,
    timezone: TZ,
    ...(view.date ? { date: view.date } : {}),
    tag: view.tag,
    hiddenCount,
    tags: summarizeTags(own),
  })
}

const fixtureNote = (
  id: string,
  title: string,
  due: string | null,
  tag = 'client-a',
): FixtureNote => {
  const dueAt = due ? at(due) : null
  return {
    id,
    title,
    tags: [tag],
    body: '',
    createdAt: NOW,
    dueAt,
    originalDueAt: dueAt,
    snoozeCount: 0,
    doneAt: null,
    notifiedDueAt: null,
  }
}

const toResponse = (note: FixtureNote): NoteResponse => ({
  id: note.id,
  title: note.title,
  tags: note.tags.map((tag) => ({ name: tag, slug: tag })),
  dueAt: note.dueAt,
  originalDueAt: note.originalDueAt,
  snoozeCount: note.snoozeCount,
  doneAt: note.doneAt,
})

/** What the server does to the full list for one change. */
function serverApply(
  notes: FixtureNote[],
  change: Exclude<ReminderChange, { type: 'insert' }>,
): FixtureNote[] {
  const target = notes.find((n) => n.id === change.id)
  if (!target) throw new Error(`No note ${change.id}`)
  const next =
    change.type === 'snooze'
      ? change.preset === 'hour'
        ? snoozeOneHour(target, NOW)
        : snoozeTomorrow(target, NOW, TZ)
      : change.type === 'done'
        ? markDone(target, NOW)
        : undoDone(target)
  return replace(notes, { ...target, ...next })
}

const N4_DONE = replace(BEFORE_CAPTURE, {
  ...BEFORE_CAPTURE.find((n) => n.id === 'N4')!,
  doneAt: at('2026-10-07 09:00'),
})

describe('applyReminderChange · parity with the server page (jorge-week, Wed 7 09:05)', () => {
  it.each<[string, FixtureNote[], Exclude<ReminderChange, { type: 'insert' }>]>([
    [
      '+1 h on a carried item moves it onto the rail',
      BEFORE_CAPTURE,
      { type: 'snooze', id: 'N2', preset: 'hour' },
    ],
    [
      '+1 h on a rail item reorders it',
      BEFORE_CAPTURE,
      { type: 'snooze', id: 'N4', preset: 'hour' },
    ],
    [
      'Tomorrow 9:00 on a rail item leaves the page',
      BEFORE_CAPTURE,
      { type: 'snooze', id: 'N5', preset: 'tomorrow' },
    ],
    [
      'Tomorrow 9:00 on a carried item leaves the page',
      BEFORE_CAPTURE,
      { type: 'snooze', id: 'N3', preset: 'tomorrow' },
    ],
    ['done on a rail item keeps it struck on the rail', BEFORE_CAPTURE, { type: 'done', id: 'N4' }],
    ['done on a carried item leaves the page', BEFORE_CAPTURE, { type: 'done', id: 'N2' }],
    ['undo on a done rail item reopens it', N4_DONE, { type: 'undo', id: 'N4' }],
    ['done on a done item keeps the first done_at', N4_DONE, { type: 'done', id: 'N4' }],
  ])('%s', (_name, notes, change) => {
    expect(applyReminderChange(respond(notes), change, NOW)).toEqual(
      respond(serverApply(notes, change)),
    )
  })

  it('a plain note adds one to the other count', () => {
    const created = fixtureNote('NX', 'Idea', null)
    const patched = applyReminderChange(
      respond(BEFORE_CAPTURE),
      { type: 'insert', note: toResponse(created) },
      NOW,
    )
    expect(patched).toEqual(respond([...BEFORE_CAPTURE, created]))
    expect(patched.otherCount).toBe(respond(BEFORE_CAPTURE).otherCount + 1)
  })

  it.each([
    ['later today', '2026-10-07 17:00'],
    ['yesterday (carried)', '2026-10-06 10:00'],
    ['tomorrow (other)', '2026-10-08 10:00'],
  ])('an inserted reminder due %s lands where the server puts it', (_name, due) => {
    const created = fixtureNote('NX', 'Call back', due)
    const patched = applyReminderChange(
      respond(BEFORE_CAPTURE),
      { type: 'insert', note: toResponse(created) },
      NOW,
    )
    expect(patched).toEqual(respond([...BEFORE_CAPTURE, created]))
  })

  it.each([
    ['timed', '2026-10-07 17:00'],
    ['plain', null],
  ])('replacing a %s temp insert with the server note does not double count', (_name, due) => {
    const real = fixtureNote('NX', 'Call back', due)
    const temp = { ...toResponse(real), id: 'temp-1' }
    const withTemp = applyReminderChange(
      respond(BEFORE_CAPTURE),
      { type: 'insert', note: temp },
      NOW,
    )
    const settled = applyReminderChange(
      withTemp,
      { type: 'insert', note: toResponse(real), replacesId: 'temp-1' },
      NOW,
    )
    expect(settled).toEqual(respond([...BEFORE_CAPTURE, real]))
  })
})

describe('applyReminderChange · edges', () => {
  it('an id that is not on the page changes nothing', () => {
    const today = respond(BEFORE_CAPTURE)
    expect(applyReminderChange(today, { type: 'done', id: 'missing' }, NOW)).toEqual(today)
  })

  it('+1 h on a done item changes nothing (the server answers 409)', () => {
    const today = respond(N4_DONE)
    expect(applyReminderChange(today, { type: 'snooze', id: 'N4', preset: 'hour' }, NOW)).toEqual(
      today,
    )
  })

  it('does not mutate its input', () => {
    const today = respond(BEFORE_CAPTURE)
    const before = structuredClone(today)
    applyReminderChange(today, { type: 'done', id: 'N4' }, NOW)
    expect(today).toEqual(before)
  })
})

// ---- Slice 3: the patch works on any viewed page (day and tag) ----

const F1 = fixtureNote('F1', 'Friday call', '2026-10-09 10:00', 'client-b')
const F2_DONE = {
  ...fixtureNote('F2', 'Friday review', '2026-10-09 14:00', 'client-a'),
  doneAt: at('2026-10-07 08:00'),
}
const WEEK: FixtureNote[] = [...BEFORE_CAPTURE, F1, F2_DONE]

const VIEWS: [string, View, string[]][] = [
  ['today', TODAY, ['N2', 'N4', 'N5']],
  ['today + #client-a', { date: null, tag: 'client-a' }, ['N2', 'N4']],
  ['Tue 6', { date: '2026-10-06', tag: null }, ['N2', 'N3']],
  ['Fri 9', { date: '2026-10-09', tag: null }, ['F1']],
  ['Fri 9 + #client-b', { date: '2026-10-09', tag: 'client-b' }, ['F1']],
]

describe('applyReminderChange · parity on every viewed page', () => {
  describe.each(VIEWS)('%s', (_name, view, targets) => {
    it.each(
      targets.flatMap(
        (id) =>
          [
            [id, 'hour'],
            [id, 'tomorrow'],
          ] as const,
      ),
    )('snooze %s %s lands where the server puts it', (id, preset) => {
      const change = { type: 'snooze', id, preset } as const
      expect(applyReminderChange(respond(WEEK, view), change, NOW)).toEqual(
        respond(serverApply(WEEK, change), view),
      )
    })

    it.each(targets)('done %s lands where the server puts it', (id) => {
      const change = { type: 'done', id } as const
      expect(applyReminderChange(respond(WEEK, view), change, NOW)).toEqual(
        respond(serverApply(WEEK, change), view),
      )
    })
  })

  it('undo of a done item on Fri 9 reopens it like the server', () => {
    const view = { date: '2026-10-09', tag: null }
    const change = { type: 'undo', id: 'F2' } as const
    const patched = applyReminderChange(respond(WEEK, view), change, NOW)
    expect(patched).toEqual(respond(serverApply(WEEK, change), view))
    expect(patched.openCount).toBe(2)
  })

  it('undo on today and on a filtered today match the server', () => {
    const doneN4 = replace(WEEK, {
      ...WEEK.find((n) => n.id === 'N4')!,
      doneAt: at('2026-10-07 09:00'),
    })
    for (const view of [TODAY, { date: null, tag: 'client-a' }]) {
      const change = { type: 'undo', id: 'N4' } as const
      expect(applyReminderChange(respond(doneN4, view), change, NOW)).toEqual(
        respond(serverApply(doneN4, change), view),
      )
    }
  })
})

describe('applyReminderChange · snooze to another day', () => {
  it('today unfiltered: Tomorrow 9:00 leaves the page and other count rises by one', () => {
    const before = respond(WEEK)
    const patched = applyReminderChange(
      before,
      { type: 'snooze', id: 'N5', preset: 'tomorrow' },
      NOW,
    )
    expect(patched.rail.map((i) => i.id)).not.toContain('N5')
    expect(patched.otherCount).toBe(before.otherCount + 1)
  })

  it('filtered: the snoozed item leaves the rail and enters others with its new date', () => {
    const view = { date: null, tag: 'client-a' }
    const before = respond(WEEK, view)
    const patched = applyReminderChange(
      before,
      { type: 'snooze', id: 'N4', preset: 'tomorrow' },
      NOW,
    )
    expect(patched.rail.map((i) => i.id)).not.toContain('N4')
    const moved = patched.others.find((o) => o.id === 'N4')
    expect(moved?.dueAt).toEqual(at('2026-10-08 09:00'))
    expect(patched.otherCount).toBe(before.otherCount + 1)
    expect(patched.hiddenCount).toBe(before.hiddenCount)
  })

  it('viewing Fri 9, +1 h lands on today and the item leaves Fri', () => {
    const view = { date: '2026-10-09', tag: null }
    const patched = applyReminderChange(
      respond(WEEK, view),
      { type: 'snooze', id: 'F1', preset: 'hour' },
      NOW,
    )
    expect(patched.rail.map((i) => i.id)).toEqual(['F2'])
    expect(patched.otherCount).toBe(respond(WEEK, view).otherCount + 1)
  })
})

describe('applyReminderChange · insert on a filtered view', () => {
  const view = { date: null, tag: 'client-a' }
  const insertOn = (created: FixtureNote, replacesId?: string, page = respond(WEEK, view)) =>
    applyReminderChange(
      page,
      { type: 'insert', note: toResponse(created), ...(replacesId ? { replacesId } : {}) },
      NOW,
    )

  it('a matching note due today joins the rail', () => {
    const created = fixtureNote('NX', 'Call back', '2026-10-07 17:00', 'client-a')
    const patched = insertOn(created)
    expect(patched).toEqual(respond([...WEEK, created], view))
    expect(patched.rail.map((i) => i.id)).toContain('NX')
  })

  it('a matching note without a date joins others', () => {
    const created = fixtureNote('NX', 'Idea', null, 'client-a')
    const patched = insertOn(created)
    expect(patched).toEqual(respond([...WEEK, created], view))
    expect(patched.others.map((o) => o.id)).toContain('NX')
  })

  it('a matching note on another day joins others with its date', () => {
    const created = fixtureNote('NX', 'Later', '2026-10-12 10:00', 'client-a')
    const patched = insertOn(created)
    expect(patched).toEqual(respond([...WEEK, created], view))
    expect(patched.others.find((o) => o.id === 'NX')?.dueAt).toEqual(at('2026-10-12 10:00'))
  })

  it('a non-matching note is hidden: hiddenCount + 1, never on the page', () => {
    const before = respond(WEEK, view)
    const created = fixtureNote('NX', 'Other client', '2026-10-07 17:00', 'client-c')
    const patched = insertOn(created)
    expect(patched.hiddenCount).toBe(before.hiddenCount + 1)
    expect(patched.rail.map((i) => i.id)).not.toContain('NX')
    expect(patched).toEqual(respond([...WEEK, created], view))
  })

  it('settling a non-matching temp insert with replacesId does not count twice', () => {
    const real = fixtureNote('NX', 'Other client', '2026-10-07 17:00', 'client-c')
    const temp = { ...real, id: 'temp-1' }
    const withTemp = insertOn(temp)
    const settled = insertOn(real, 'temp-1', withTemp)
    expect(settled.hiddenCount).toBe(respond(WEEK, view).hiddenCount + 1)
    expect(settled).toEqual(respond([...WEEK, real], view))
  })

  it('settling a matching temp insert with replacesId does not count twice', () => {
    const real = fixtureNote('NX', 'Call back', null, 'client-a')
    const temp = { ...real, id: 'temp-1' }
    const settled = insertOn(real, 'temp-1', insertOn(temp))
    expect(settled).toEqual(respond([...WEEK, real], view))
  })
})

describe('applyReminderChange · insert on another day', () => {
  it('a note due on the viewed day joins its rail; one due elsewhere adds to other count', () => {
    const view = { date: '2026-10-09', tag: null }
    const onDay = fixtureNote('NX', 'Friday add', '2026-10-09 17:00')
    const elsewhere = fixtureNote('NY', 'Monday add', '2026-10-12 17:00')
    const patchedOn = applyReminderChange(
      respond(WEEK, view),
      { type: 'insert', note: toResponse(onDay) },
      NOW,
    )
    expect(patchedOn).toEqual(respond([...WEEK, onDay], view))
    const patchedElse = applyReminderChange(
      respond(WEEK, view),
      { type: 'insert', note: toResponse(elsewhere) },
      NOW,
    )
    expect(patchedElse).toEqual(respond([...WEEK, elsewhere], view))
    expect(patchedElse.otherCount).toBe(respond(WEEK, view).otherCount + 1)
  })
})

describe('applyReminderChange · tags', () => {
  it('keeps the page tags and adds a new slug from an insert, sorted', () => {
    const created = fixtureNote('NX', 'Brand new', null, 'aaa-new')
    const before = respond(WEEK)
    const patched = applyReminderChange(before, { type: 'insert', note: toResponse(created) }, NOW)
    expect(patched.tags.map((t) => t.slug)).toEqual(['aaa-new', ...before.tags.map((t) => t.slug)])
    expect(patched.tags).toEqual(respond([...WEEK, created]).tags)
  })

  it('a change that adds no tag leaves tags untouched', () => {
    const before = respond(WEEK)
    expect(applyReminderChange(before, { type: 'done', id: 'N4' }, NOW).tags).toEqual(before.tags)
  })
})
