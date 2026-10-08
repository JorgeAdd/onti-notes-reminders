import { render, screen } from '@testing-library/react'
import { expect, it } from 'vitest'
import { ItemRow } from '../src/features/today/ItemRow'
import { c4Response } from './today-fixture'

const today = c4Response()
const [late] = today.carried[0]!.items
const [upcoming] = today.rail

const renderRow = (item = late!) =>
  render(
    <ul>
      <ItemRow item={item} now={today.now} timezone={today.timezone} />
    </ul>,
  )

it('shows time, title, tags as #slug and the relative label as plain text (R2)', () => {
  renderRow()
  expect(screen.getByRole('listitem')).toHaveTextContent('18:00')
  expect(screen.getByText('Reply to Marta about the staging deploy window')).toBeInTheDocument()
  expect(screen.getByText('#client-a')).toBeInTheDocument()
  expect(screen.getByText('late 15h05')).toBeInTheDocument()
})

it('reads "in {duration}" for an upcoming item (R6)', () => {
  renderRow(upcoming)
  expect(screen.getByText('in 25 min')).toBeInTheDocument()
})

it('strikes a done item through, without a relative label (SG12)', () => {
  renderRow({ ...upcoming!, doneAt: today.now })
  const title = screen.getByText(upcoming!.title)
  expect(title.closest('s')).not.toBeNull()
  expect(screen.queryByText(/^(late|in) /)).not.toBeInTheDocument()
})

it('is read-only: no controls, no internal ids (rule 13)', () => {
  renderRow()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  expect(screen.queryByRole('link')).not.toBeInTheDocument()
  expect(document.body.textContent).not.toMatch(/\bN\d{1,2}\b/)
})
