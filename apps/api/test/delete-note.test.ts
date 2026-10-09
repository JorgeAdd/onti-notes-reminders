import { describe, expect, it } from 'vitest'
import { makeDeleteNote } from '../src/application/delete-note'
import { NotFoundError } from '../src/application/errors'
import { ANA, InMemoryNotes, JORGE, noteId, noteRecord } from './fakes'

const JORGE_NOTE = noteRecord(1, { title: 'Mine' })
const ANA_NOTE = noteRecord(2, { title: 'Hers' })

function world() {
  const notes = new InMemoryNotes([
    { ownerId: JORGE.userId, note: JORGE_NOTE },
    { ownerId: ANA.userId, note: ANA_NOTE },
  ])
  return { notes, deleteNote: makeDeleteNote({ notes }) }
}

describe('deleteNote (R20, R15)', () => {
  it('removes an own note for good', async () => {
    const { notes, deleteNote } = world()
    await deleteNote(JORGE, JORGE_NOTE.id)
    expect(await notes.findOwn(JORGE, JORGE_NOTE.id)).toBeNull()
    expect(await notes.listOwn(JORGE)).toEqual([])
  })

  it('leaves the other notes alone', async () => {
    const { notes, deleteNote } = world()
    await deleteNote(JORGE, JORGE_NOTE.id)
    expect(notes.get(ANA_NOTE.id)).toEqual(ANA_NOTE)
  })

  it("is NotFound for another user's note and the note survives (C11)", async () => {
    const { notes, deleteNote } = world()
    await expect(deleteNote(JORGE, ANA_NOTE.id)).rejects.toBeInstanceOf(NotFoundError)
    expect(notes.get(ANA_NOTE.id)).toEqual(ANA_NOTE)
  })

  it('is NotFound for an unknown id and for a repeat', async () => {
    const { deleteNote } = world()
    await expect(deleteNote(JORGE, noteId(999))).rejects.toBeInstanceOf(NotFoundError)
    await deleteNote(JORGE, JORGE_NOTE.id)
    await expect(deleteNote(JORGE, JORGE_NOTE.id)).rejects.toBeInstanceOf(NotFoundError)
  })
})
