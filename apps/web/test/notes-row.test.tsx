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

const renderRow = (item: NoteListItem, onOpen: (id: string) => void = () => undefined) =>
  render(
    <ul>
      <NoteRow note={item} now={now} timezone={TZ} onOpen={onOpen} />
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
  expect(container.querySelector('p, [class*=excerpt]')).toBeNull()
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

it('is one button per row: Enter and click open the note, x, s and z do nothing', async () => {
  const onOpen = vi.fn()
  const { container } = render(
    <NoteList notes={[note()]} now={now} timezone={TZ} onOpen={onOpen} />,
  )
  const row = screen.getByRole('listitem')
  const button = within(row).getByRole('button', { name: /Staging URL and test accounts/ })
  expect(container.querySelectorAll('button, a, input, [tabindex]')).toHaveLength(1)
  expect(button).toHaveAttribute('type', 'button')

  await userEvent.keyboard('xsz')
  expect(onOpen).not.toHaveBeenCalled()

  await userEvent.tab()
  expect(button).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  await userEvent.click(button)
  expect(onOpen).toHaveBeenNthCalledWith(1, '11111111-1111-4111-8111-111111111111')
  expect(onOpen).toHaveBeenCalledTimes(2)
})

it('lists the notes in the order given', () => {
  const second = note({ id: '22222222-2222-4222-8222-222222222222', title: 'Second' })
  render(<NoteList notes={[note(), second]} now={now} timezone={TZ} onOpen={() => undefined} />)
  const rows = screen.getAllByRole('listitem')
  expect(rows[0]).toHaveTextContent('Staging URL')
  expect(rows[1]).toHaveTextContent('Second')
})

it('gives the row button a 44 px target and a visible focus ring [static]', () => {
  const css = readFileSync('src/features/notes/NoteRow.module.css', 'utf8')
  expect(css).toMatch(/min-height:\s*var\(--size-target\)/)
  expect(css).toMatch(/:focus-visible[^{]*\{[^}]*var\(--focus-ring\)/)
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
