import { PUSH_COPY, pushPayloadSchema } from '@onti/shared'
import { at, N1 } from '@onti/shared/fixtures/jorge-week'
import { describe, expect, it } from 'vitest'
import type { ClaimedReminder } from '../src/application/push-ports'
import { buildPushPayload } from '../src/application/push-payload'
import { noteId } from './fakes'

const USER = '7b0c5a2e-3f4d-4c1a-9e8b-2d6f0a1b3c4d'
const N1_BODY = `Ana needs to move **admin** permissions on \`client-a/web\` from me to Luis
before Friday's release.

- Repo settings → Collaborators
- Keep me as _maintainer_ until the handoff`

const extras = { token: 'signed.token', apiUrl: 'https://api.example.com' }

function claimed(overrides: Partial<ClaimedReminder> = {}): ClaimedReminder {
  return {
    noteId: noteId(1),
    userId: USER,
    title: N1.title,
    body: N1_BODY,
    dueAt: at('2026-10-06 17:00'),
    timezone: 'America/Mexico_City',
    tagNames: ['Client A'],
    ...overrides,
  }
}

describe('buildPushPayload', () => {
  it('builds the C2 notification: title with local time, two plain lines and the tag', () => {
    const payload = buildPushPayload(claimed(), extras)
    expect(payload.title).toBe('17:00 · Notify Ana: move repo permissions from me to Luis')
    expect(payload.body).toBe(
      'Ana needs to move admin permissions on client-a/web from me to Luis\n' +
        "before Friday's release.\n" +
        'Client A',
    )
    expect(payload.appName).toBe(PUSH_COPY.appName)
    expect(payload.v).toBe(1)
  })

  it('uses the note id as tag so a newer push replaces the older one', () => {
    const payload = buildPushPayload(claimed(), extras)
    expect(payload.tag).toBe(noteId(1))
    expect(payload.noteId).toBe(noteId(1))
  })

  it('embeds the token, the API url, the due instant and both actions', () => {
    const payload = buildPushPayload(claimed(), extras)
    expect(payload.token).toBe('signed.token')
    expect(payload.apiUrl).toBe('https://api.example.com')
    expect(payload.dueAt).toBe(at('2026-10-06 17:00').getTime())
    expect(payload.actions).toEqual([
      { action: 'done', title: PUSH_COPY.done },
      { action: 'snooze', title: PUSH_COPY.snooze },
    ])
    expect(pushPayloadSchema.safeParse(payload).success).toBe(true)
  })

  it('renders the title in the New York zone', () => {
    const payload = buildPushPayload(
      claimed({ timezone: 'America/New_York', dueAt: new Date('2026-10-06T21:00:00Z') }),
      extras,
    )
    expect(payload.title.startsWith('17:00 · ')).toBe(true)
    const mexico = buildPushPayload(claimed({ dueAt: new Date('2026-10-06T21:00:00Z') }), extras)
    expect(mexico.title.startsWith('15:00 · ')).toBe(true)
  })

  it('falls back to UTC for an invalid zone', () => {
    const payload = buildPushPayload(
      claimed({ timezone: 'Mars/Olympus', dueAt: new Date('2026-10-06T21:05:00Z') }),
      extras,
    )
    expect(payload.title.startsWith('21:05 · ')).toBe(true)
  })

  it('has an empty body without text and without tags', () => {
    expect(buildPushPayload(claimed({ body: '', tagNames: [] }), extras).body).toBe('')
  })

  it('has only the tags as body when the note has no text', () => {
    expect(
      buildPushPayload(claimed({ body: '', tagNames: ['Client A', 'Client B'] }), extras).body,
    ).toBe('Client A, Client B')
  })

  it('cuts a long first line to 120 characters before adding the tag', () => {
    const body = buildPushPayload(claimed({ body: 'z'.repeat(300) }), extras).body
    expect(body).toBe(`${'z'.repeat(119)}…\nClient A`)
  })

  it('never shows an internal id in visible text (rule 13)', () => {
    const payload = buildPushPayload(claimed(), extras)
    expect(payload.title).not.toContain(noteId(1))
    expect(payload.body).not.toContain(noteId(1))
    expect(payload.title).not.toMatch(/\bN\d{1,2}\b/)
  })
})
