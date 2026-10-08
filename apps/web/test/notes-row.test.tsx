import type { NoteListItem } from '@onti/shared'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
import { expect, it, vi } from 'vitest'
import { NoteList } from '../src/features/notes/NoteList'
import { NoteRow } from '../src/features/notes/NoteRow'
import { messages } from '../src/messages'

const TZ = 'America/Mexico_City'
const now = new Date('2026-10-07T15:05:00.000Z')

const note = (over: Partial<NoteListItem> = {}): NoteListItem => ({
  id: '11111111-1111-4111-8111-111111111111',
  title: 'Staging URL and test accounts',
  tags: [{ name: 'Client B', slug: 'client-b' }],
  dueAt: new Date('2026-10-06T23:00:00.000Z'),
  doneAt: null,
  excerpt: 'Collaborators need access before the release.',
  ...over,
})

const renderRow = (item: NoteListItem) =>
  render(
    <ul>
      <NoteRow note={item} now={now} timezone={TZ} />
    </ul>,
  )

it('shows title, tags, due label and the excerpt as text', () => {
  renderRow(note())
  const row = screen.getByRole('listitem')
  expect(within(row).getByText('Staging URL and test accounts')).toBeInTheDocument()
  expect(within(row).getByText('#client-b')).toBeInTheDocument()
  expect(within(row).getByText('Tue 6 17:00')).toBeInTheDocument()
  expect(within(row).getByText('Collaborators need access before the release.')).toBeInTheDocument()
  expect(within(row).queryByText(messages.notes.done)).not.toBeInTheDocument()
})

it('has no due label, no tags and no excerpt line when the note has none', () => {
  const { container } = renderRow(note({ dueAt: null, tags: [], excerpt: '' }))
  const row = screen.getByRole('listitem')
  expect(row).toHaveTextContent(/^Staging URL and test accounts$/)
  expect(container.querySelector('p')).toBeNull()
})

it('strikes a done title and says "done" to assistive technology', () => {
  renderRow(note({ doneAt: new Date('2026-10-07T14:00:00.000Z') }))
  const row = screen.getByRole('listitem')
  expect(row.querySelector('s')).toHaveTextContent('Staging URL and test accounts')
  expect(within(row).getByText(messages.notes.done)).toBeInTheDocument()
})

it('renders an excerpt full of markup literally: no element, no handler', () => {
  const hostile = '<img src=x onerror=alert(1)>'
  const { container } = renderRow(note({ excerpt: hostile, title: '<b>bold</b>' }))
  expect(screen.getByText(hostile)).toBeInTheDocument()
  expect(screen.getByText('<b>bold</b>')).toBeInTheDocument()
  expect(container.querySelector('img, b')).toBeNull()
})

it('is read-only: not focusable, no handlers, keys do nothing (x, s, z)', async () => {
  const onClick = vi.fn()
  const { container } = render(
    <div onClick={onClick}>
      <NoteList notes={[note()]} now={now} timezone={TZ} />
    </div>,
  )
  const row = screen.getByRole('listitem')
  expect(row).not.toHaveAttribute('tabindex')
  expect(row.getAttributeNames().filter((name) => name.startsWith('on'))).toEqual([])
  expect(container.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(0)
  await userEvent.keyboard('xsz')
  expect(row).not.toHaveFocus()
  expect(document.body).toHaveFocus()
})

it('lists the notes in the order given', () => {
  const second = note({ id: '22222222-2222-4222-8222-222222222222', title: 'Second' })
  render(<NoteList notes={[note(), second]} now={now} timezone={TZ} />)
  const rows = screen.getAllByRole('listitem')
  expect(rows[0]).toHaveTextContent('Staging URL')
  expect(rows[1]).toHaveTextContent('Second')
})

it('styles rows with tokens only and never the vermilion date colour', () => {
  // The 640px breakpoint is the one literal length, shared with use-narrow.ts.
  const css = readFileSync('src/features/notes/NoteRow.module.css', 'utf8').replace(
    '(max-width: 640px)',
    '',
  )
  expect(css).not.toMatch(/#[0-9a-f]{3,6}\b|--core-|font-size|--color-date/i)
  expect(css).not.toMatch(/(?<![\d.])(?!1px)\d+px/)
})
