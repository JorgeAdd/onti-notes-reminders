import { describe, expect, it } from 'vitest'
import { main } from '../scripts/seed-demo'

describe('seed:demo CLI', () => {
  it('exits 2 without a target and never touches the database', async () => {
    expect(await main([], { DATABASE_URL: 'postgres://unused' })).toBe(2)
  })

  it('exits 2 when DATABASE_URL is missing', async () => {
    expect(await main(['--email', 'demo@example.com'], {})).toBe(2)
  })
})
