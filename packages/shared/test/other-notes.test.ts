/** R12 · "Other notes with #tag": order and shape. */
import { describe, expect, it } from 'vitest'
import { buildDayPage, otherNotes } from '../src'
import { at, BEFORE_CAPTURE, TZ, type FixtureNote } from './fixtures/jorge-week'

const ids = (notes: { id: string }[]) => notes.map((n) => n.id)
const clientB = BEFORE_CAPTURE.filter((n) => n.tags.includes('client-b'))

describe('otherNotes', () => {
  it('C8: the matches that are not on the page, in stable order', () => {
    const page = buildDayPage(clientB, at('2026-10-08 14:30'), TZ)
    expect(ids(page.rail)).toEqual(['N6'])
    // all undated: by title (API keys, Diego, Review agenda, Staging URL)
    expect(ids(otherNotes(clientB, page))).toEqual(['N7', 'N10', 'N9', 'N8'])
  })

  it('orders dated notes by dueAt, then undated last by title, then id', () => {
    const base = clientB[0] as FixtureNote
    const mk = (id: string, title: string, due: string | null): FixtureNote => ({
      ...base,
      id,
      title,
      dueAt: due ? at(due) : null,
      originalDueAt: due ? at(due) : null,
    })
    const notes = [
      mk('u2', 'beta', null),
      mk('d2', 'later', '2026-10-12 09:00'),
      mk('u1', 'alpha', null),
      mk('d1', 'sooner', '2026-10-11 09:00'),
      mk('u3', 'beta', null),
    ]
    const page = buildDayPage(notes, at('2026-10-08 14:30'), TZ)
    expect(ids(otherNotes(notes, page))).toEqual(['d1', 'd2', 'u1', 'u2', 'u3'])
  })

  it('leaves out what is on the page, carried items included', () => {
    const notes = BEFORE_CAPTURE.filter((n) => ['N2', 'N3', 'N4', 'N7'].includes(n.id))
    const page = buildDayPage(notes, at('2026-10-07 09:05'), TZ)
    expect(ids(page.carried[0]?.items ?? [])).toEqual(['N2', 'N3'])
    expect(ids(otherNotes(notes, page))).toEqual(['N7'])
  })

  it('undated rows carry no date (dueAt null stays null)', () => {
    const page = buildDayPage(clientB, at('2026-10-08 14:30'), TZ)
    const undated = otherNotes(clientB, page).filter((n) => n.id === 'N7')
    expect(undated).toHaveLength(1)
    expect(undated[0]?.dueAt).toBeNull()
  })
})
