import { render, screen, within } from '@testing-library/react'
import { expect, it } from 'vitest'
import { CarriedGroup } from '../src/features/today/CarriedGroup'
import { c4Response } from './today-fixture'

const today = c4Response()

it('titles the group "Still open from Tue 6" and lists the late items oldest first (R3, SG3)', () => {
  render(<CarriedGroup group={today.carried[0]!} now={today.now} timezone={today.timezone} />)
  const group = screen.getByRole('region', { name: 'Still open from Tue 6' })
  const rows = within(group).getAllByRole('listitem')
  expect(rows).toHaveLength(2)
  expect(rows[0]).toHaveTextContent('Reply to Marta')
  expect(rows[0]).toHaveTextContent('late 15h05')
  expect(rows[1]).toHaveTextContent('Update the estimate')
  expect(rows[1]).toHaveTextContent('late 14h35')
})

it('orders oldest first even if the items arrive reversed', () => {
  const group = { ...today.carried[0]!, items: [...today.carried[0]!.items].reverse() }
  render(<CarriedGroup group={group} now={today.now} timezone={today.timezone} />)
  expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Reply to Marta')
})
