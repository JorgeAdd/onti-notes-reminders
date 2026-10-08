import { describe, expect, it } from 'vitest'
import { excerptOf } from '../src/domain/excerpt'

describe('excerptOf', () => {
  it('gives an empty string for an empty or blank body', () => {
    expect(excerptOf('')).toBe('')
    expect(excerptOf('  \n\t ')).toBe('')
  })

  it('collapses newlines and runs of spaces, and trims', () => {
    expect(excerptOf('  one\n\ntwo \t three\r\nfour  ')).toBe('one two three four')
  })

  it('leaves a body of exactly 120 units untouched', () => {
    const body = 'a'.repeat(120)
    expect(excerptOf(body)).toBe(body)
    expect(excerptOf(body).length).toBe(120)
  })

  it('cuts at 120 units including the ellipsis', () => {
    const out = excerptOf('a'.repeat(121))
    expect(out).toBe(`${'a'.repeat(119)}…`)
    expect(out.length).toBe(120)
  })

  it('cuts at the last space when one lies in the last 40 units', () => {
    const body = `${'a'.repeat(100)} ${'b'.repeat(60)}`
    expect(excerptOf(body)).toBe(`${'a'.repeat(100)}…`)
  })

  it('ignores a space earlier than the last 40 units', () => {
    const body = `${'a'.repeat(50)} ${'b'.repeat(100)}`
    const out = excerptOf(body)
    expect(out).toBe(`${'a'.repeat(50)} ${'b'.repeat(68)}…`)
    expect(out.length).toBe(120)
  })

  it('never cuts between the halves of a surrogate pair', () => {
    const body = '😀'.repeat(100)
    const out = excerptOf(body)
    expect(out.length).toBeLessThanOrEqual(120)
    expect(out.endsWith('…')).toBe(true)
    const kept = out.slice(0, -1)
    expect(kept).toBe('😀'.repeat(kept.length / 2))
    expect(kept.length / 2).toBe(59)
  })
})
