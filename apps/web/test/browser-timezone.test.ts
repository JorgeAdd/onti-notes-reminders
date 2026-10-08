import { expect, it } from 'vitest'
import { browserTimeZone } from '../src/lib/browser-timezone'

it('reads the IANA zone the runtime resolves', () => {
  expect(browserTimeZone()).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone)
  expect(browserTimeZone()).not.toBe('')
})
