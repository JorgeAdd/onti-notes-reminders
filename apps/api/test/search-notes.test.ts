import { notesListResponseSchema, tagNameFromSlug } from '@onti/shared'
import { at, BEFORE_CAPTURE, N1 } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { makeSearchNotes } from '../src/application/search-notes'
import type { Clock, Profile } from '../src/application/ports'
import { excerptOf } from '../src/domain/excerpt'
import { ANA, InMemoryNotes, JORGE, noteId, noteRecord, profileReturning } from './fakes'

/** docs/product/scenario-dataset.md: the only two bodies the dataset defines. */
const N1_BODY = `Ana needs to move **admin** permissions on \`client-a/web\` from me to Luis
before Friday's release.

- Repo settings → Collaborators
- Keep me as _maintainer_ until the handoff`
const N8_BODY = `Staging: https://staging.client-b.example

- \`qa-admin\` / see 1Password
- \`qa-viewer\` / see 1Password`
const BODIES: Record<string, string> = { N1: N1_BODY, N8: N8_BODY }

const MEXICO: Profile = { timezone: 'America/Mexico_City' }
const NOW = at('2026-10-07 09:05')

/** Jorge's 15 notes: N1 (index 0) is the newest, the rest share one creation time. */
const DATASET = [N1, ...BEFORE_CAPTURE].map((fixture, index) => ({
  ownerId: JORGE.userId,
  body: BODIES[fixture.id] ?? '',
  createdAt: fixture.createdAt,
  note: noteRecord(index, {
    title: fixture.title,
    tags: fixture.tags.map((slug) => ({ slug, name: tagNameFromSlug(slug) })),
    dueAt: fixture.dueAt,
    originalDueAt: fixture.originalDueAt,
    doneAt: fixture.doneAt,
  }),
}))
const titleOf = (n: number) => DATASET[n]!.note.title
const N2 = 1
const N8 = 7

function searcher(
  owned: ConstructorParameters<typeof InMemoryNotes>[0] = DATASET,
  profile: Profile | null = MEXICO,
) {
  let reads = 0
  const clock: Clock = {
    now: () => {
      reads += 1
      return NOW
    },
  }
  const search = makeSearchNotes({
    clock,
    notes: new InMemoryNotes(owned),
    profiles: profileReturning(profile),
  })
  return { search, reads: () => reads }
}

const titles = (response: { notes: { title: string }[] }) => response.notes.map((n) => n.title)

describe('searchNotes (C9)', () => {
  it('finds "staging" in a title (N2) and in a title and body (N8), newest first', async () => {
    const { notes, total } = await searcher().search(JORGE, 'staging')
    // N2 and N8 share a creation time, so the id breaks the tie: higher id first.
    expect(notes.map((n) => n.title)).toEqual([titleOf(N8), titleOf(N2)])
    expect(total).toBe(15)
  })

  it('is case-insensitive and matches by word prefix', async () => {
    for (const q of ['STAGING', 'Staging', 'stag']) {
      const { notes } = await searcher().search(JORGE, q)
      expect(notes.map((n) => n.title)).toEqual([titleOf(N8), titleOf(N2)])
    }
  })

  it('searches bodies: a word only in the body of N1 finds N1', async () => {
    for (const q of ['collaborators', 'release', 'COLLAB']) {
      const found = await searcher().search(JORGE, q)
      expect(titles(found)).toEqual([titleOf(0)])
    }
  })

  it('requires every term (AND)', async () => {
    expect(titles(await searcher().search(JORGE, 'staging url'))).toEqual([titleOf(N8)])
    expect(titles(await searcher().search(JORGE, 'staging deploy'))).toEqual([titleOf(N2)])
    expect(titles(await searcher().search(JORGE, 'staging zzzz'))).toEqual([])
  })

  it('does not narrow the total: 2 matches of 15, no match of 15', async () => {
    expect((await searcher().search(JORGE, 'staging')).total).toBe(15)
    const none = await searcher().search(JORGE, 'zzzz')
    expect(none.notes).toEqual([])
    expect(none.total).toBe(15)
  })
})

describe('searchNotes listing', () => {
  it('returns every note newest first when q is missing, empty, blank or punctuation', async () => {
    for (const q of [undefined, '', '   ', '???']) {
      const found = await searcher().search(JORGE, q)
      expect(found.notes).toHaveLength(15)
      expect(found.total).toBe(15)
      expect(found.notes[0]!.title).toBe(N1.title)
      // The other 14 share one creation time: id desc.
      expect(found.notes.slice(1).map((n) => n.id)).toEqual(
        DATASET.slice(1)
          .map((r) => r.note.id)
          .reverse(),
      )
    }
  })

  it('caps the list at 50 and keeps the total at 60', async () => {
    const sixty = Array.from({ length: 60 }, (_, i) => ({
      ownerId: JORGE.userId,
      body: '',
      createdAt: new Date(Date.UTC(2026, 9, 1, 0, i)),
      note: noteRecord(i + 1),
    }))
    const found = await searcher(sixty).search(JORGE)
    expect(found.notes).toHaveLength(50)
    expect(found.total).toBe(60)
    expect(found.notes[0]!.id).toBe(noteId(60))
    expect(found.notes[49]!.id).toBe(noteId(11))
  })

  it('maps rows to list items: tags, due, done and a plain-text excerpt', async () => {
    const { notes } = await searcher().search(JORGE, 'collaborators')
    expect(notes).toEqual([
      {
        id: DATASET[0]!.note.id,
        title: N1.title,
        tags: [{ slug: 'client-a', name: 'Client A' }],
        dueAt: N1.dueAt,
        doneAt: null,
        excerpt: excerptOf(N1_BODY),
      },
    ])
    expect(notes[0]!.excerpt).toContain('**admin**')
  })

  it('gives an empty excerpt for a note without a body', async () => {
    const { notes } = await searcher().search(JORGE, 'glossary')
    expect(notes.map((n) => n.excerpt)).toEqual([''])
  })

  it('produces a response the shared schema accepts, even for an emoji-heavy body', async () => {
    const emoji = {
      ownerId: JORGE.userId,
      body: '😀'.repeat(300),
      createdAt: new Date(Date.UTC(2026, 9, 7)),
      note: noteRecord(900, { title: 'Emoji' }),
    }
    const { search } = searcher([emoji])
    const response = await search(JORGE)
    expect(response.notes[0]!.excerpt.length).toBeLessThanOrEqual(120)
    const wire = z.encode(notesListResponseSchema, response)
    expect(notesListResponseSchema.safeParse(wire).success).toBe(true)
  })
})

describe('searchNotes input, clock and timezone', () => {
  it('never throws on operator-heavy input', async () => {
    for (const q of [`staging' | !:* (`, '& | ! <-> :*', `"quoted" \\ ) (`, 'a'.repeat(200)]) {
      await expect(searcher().search(JORGE, q)).resolves.toMatchObject({ total: 15 })
    }
    const hostile = await searcher().search(JORGE, `staging' | !:* (`)
    expect(titles(hostile)).toEqual([titleOf(N8), titleOf(N2)])
  })

  it('uses the profile timezone, UTC while the profile is missing, and reads the clock once', async () => {
    const withProfile = searcher()
    const a = await withProfile.search(JORGE, 'staging')
    expect(a.timezone).toBe('America/Mexico_City')
    expect(a.now).toEqual(NOW)
    expect(withProfile.reads()).toBe(1)

    const withoutProfile = searcher(DATASET, null)
    expect((await withoutProfile.search(JORGE)).timezone).toBe('UTC')
    expect(withoutProfile.reads()).toBe(1)
  })
})

describe('searchNotes ownership (R15)', () => {
  const anaStaging = {
    ownerId: ANA.userId,
    body: 'staging for Ana',
    createdAt: new Date(Date.UTC(2026, 9, 7)),
    note: noteRecord(500, { title: 'Ana staging checklist' }),
  }

  it("never lists another user's notes and counts only the caller's", async () => {
    const mixed = [...DATASET, anaStaging]
    const asAna = await searcher(mixed).search(ANA, 'staging')
    expect(titles(asAna)).toEqual(['Ana staging checklist'])
    expect(asAna.total).toBe(1)

    const asJorge = await searcher(mixed).search(JORGE, 'staging')
    expect(titles(asJorge)).toEqual([titleOf(N8), titleOf(N2)])
    expect(asJorge.total).toBe(15)
  })

  it("shows Ana 0 of Jorge's notes", async () => {
    const asAna = await searcher(DATASET).search(ANA)
    expect(asAna.notes).toEqual([])
    expect(asAna.total).toBe(0)
  })
})
