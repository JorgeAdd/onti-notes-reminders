import { readFileSync } from 'node:fs'
import webpush from 'web-push'
import { describe, expect, it } from 'vitest'

describe('web-push interop', () => {
  it('exposes the functions through the default import (CommonJS under ESM)', () => {
    expect(typeof webpush.sendNotification).toBe('function')
    expect(typeof webpush.generateVAPIDKeys).toBe('function')
  })

  it('generates keys that the sender can use', () => {
    const keys = webpush.generateVAPIDKeys()
    expect(keys.publicKey.length).toBeGreaterThan(40)
    expect(keys.privateKey.length).toBeGreaterThan(20)
  })

  it('stays in dependencies, the only packages tsup leaves external', () => {
    const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as {
      dependencies: Record<string, string>
    }
    expect(Object.keys(pkg.dependencies)).toContain('web-push')
  })
})
