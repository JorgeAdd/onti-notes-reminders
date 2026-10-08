import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import {
  animationOf,
  blocks,
  cssFiles,
  customProps,
  keyframes,
  ms,
  readSrc,
  resolve,
  tokens,
} from './css-tokens'

const t = tokens()
const desktop = t.root
const mobile = { ...t.root, ...t.mobile }
const reduced = { ...t.root, ...t.reduced }
const reducedMobile = { ...t.root, ...t.mobile, ...t.reduced }

const entrance = (): string => readSrc('styles/entrance.module.css')
const RULES = ['[data-entrance] .sheet', '[data-entrance] .date', '[data-entrance] .last']

/** Longest delay + duration across the three entrance rules, with the given tokens resolved. */
const total = (map: Record<string, string>, rules = RULES) =>
  Math.max(
    ...rules.map((r) => {
      const a = animationOf(entrance(), r)
      return ms(resolve(a.delay, map)) + ms(resolve(a.duration!, map))
    }),
  )

describe('entrance tokens', () => {
  it('defines the seven roles with the exact values', () => {
    expect(Object.fromEntries(Object.entries(desktop).filter(([k]) => /entrance/.test(k)))).toEqual(
      {
        '--motion-entrance': 'var(--core-duration-240)',
        '--motion-entrance-detail': 'var(--core-duration-150)',
        '--entrance-rise': 'var(--space-md)',
        '--entrance-rise-detail': 'var(--space-xs)',
        '--entrance-clip-start': 'inset(0 0 100% 0)',
        '--entrance-delay-date': 'var(--core-duration-80)',
        '--entrance-delay-bar': 'var(--core-duration-150)',
      },
    )
  })

  it('adds no header rule role, no extra easing and no overshoot', () => {
    expect(t.css).not.toMatch(/--entrance-rule|--entrance-delay-rule|--ease-enter|--ease-exit/)
    const curves = [...t.css.matchAll(/cubic-bezier\(([^)]*)\)/g)]
    for (const [, args] of curves) {
      for (const n of (args ?? '').split(',')) expect(parseFloat(n)).toBeLessThanOrEqual(1)
    }
  })

  it('remaps the rise on mobile before the reduced-motion block', () => {
    expect(t.mobile).toEqual({ '--entrance-rise': 'var(--space-sm)' })
    expect(t.mobileIndex).toBeGreaterThan(-1)
    expect(t.mobileIndex).toBeLessThan(t.reducedIndex)
    expect(resolve('var(--entrance-rise)', desktop)).toBe('0.75rem')
    expect(resolve('var(--entrance-rise)', mobile)).toBe('0.5rem')
  })

  it('remaps the entrance only in the global reduced-motion block', () => {
    expect(
      Object.fromEntries(Object.entries(t.reduced).filter(([k]) => /entrance/.test(k))),
    ).toEqual({
      '--entrance-rise': '0',
      '--entrance-rise-detail': '0',
      '--entrance-clip-start': 'inset(0)',
      '--motion-entrance': 'var(--core-duration-150)',
      '--motion-entrance-detail': 'var(--core-duration-instant)',
      '--entrance-delay-date': 'var(--core-duration-instant)',
      '--entrance-delay-bar': 'var(--core-duration-instant)',
    })
  })
})

describe('entrance keyframes under reduced motion', () => {
  it.each([
    ['alone', reduced],
    ['with the mobile remap', reducedMobile],
  ])('first frame equals the resting state (%s)', (_, map) => {
    for (const name of ['sheet-in', 'date-in']) {
      const { from, to } = keyframes(entrance(), name)
      expect(resolve(from['transform']!, map)).toBe(resolve(to['transform']!, map))
    }
    const sheet = keyframes(entrance(), 'sheet-in')
    expect(resolve(sheet.from['clip-path']!, reduced)).toBe(sheet.to['clip-path'])
    expect(sheet.from['opacity']).toBe('0')
  })

  it('moves and clips the sheet in the normal state', () => {
    const { from, to } = keyframes(entrance(), 'sheet-in')
    expect(resolve(from['transform']!, desktop)).toBe('translateY(0.75rem)')
    expect(resolve(from['transform']!, mobile)).toBe('translateY(0.5rem)')
    expect(resolve(from['clip-path']!, desktop)).toBe('inset(0 0 100% 0)')
    expect(to['transform']).toBe('translateY(0)')
  })

  it('resolves delays to 0 ms and the sheet to at most 150 ms', () => {
    const date = animationOf(entrance(), '[data-entrance] .date')
    const bar = animationOf(entrance(), '[data-entrance] .last')
    const sheet = animationOf(entrance(), '[data-entrance] .sheet')
    expect(ms(resolve(date.delay, reduced))).toBe(0)
    expect(ms(resolve(bar.delay, reduced))).toBe(0)
    expect(ms(resolve(date.duration!, reduced))).toBe(0)
    expect(ms(resolve(sheet.duration!, reduced))).toBeLessThanOrEqual(150)
  })
})

describe('entrance choreography', () => {
  it('stays within 500 ms on desktop and mobile', () => {
    // The capture bar exists on mobile only.
    expect(total(desktop, RULES.slice(0, 2))).toBe(240)
    expect(total(mobile)).toBe(300)
  })

  it('uses the paper easing, backwards fill and the documented delays', () => {
    for (const r of RULES) {
      const a = animationOf(entrance(), r)
      expect(a.easing).toBe('var(--ease-paper)')
      expect(a.fill).toBe('backwards')
    }
    expect(animationOf(entrance(), RULES[1]!).delay).toBe('var(--entrance-delay-date)')
    expect(animationOf(entrance(), RULES[2]!).delay).toBe('var(--entrance-delay-bar)')
  })

  it('fades the capture bar in with opacity only', () => {
    const { from, to } = keyframes(entrance(), 'last-in')
    expect(Object.keys(from)).toEqual(['opacity'])
    expect(Object.keys(to)).toEqual(['opacity'])
  })

  it('reads only motion, ease and entrance tokens, with no raw durations', () => {
    const css = entrance()
    const refs = [...css.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]!)
    for (const ref of refs) expect(ref).toMatch(/^--(motion-|ease-|entrance-)/)
    expect(css).not.toMatch(/--core-|cubic-bezier|\d(ms|s|px)\b|@media|animation-delay|nth-/)
  })

  it('targets only the sheet, the date block and the capture bar (no row or field stagger)', () => {
    const rules = blocks(entrance()).filter((b) => !b.header.startsWith('@keyframes'))
    expect(rules.map((b) => b.header)).toEqual(RULES)
  })
})

describe('motion across the stylesheets', () => {
  const files = cssFiles()

  it('has no transition anywhere (theme swaps are instant)', () => {
    for (const f of files) expect(readFileSync(f, 'utf8'), f).not.toMatch(/\btransition\b/)
  })

  it('keeps entrance remaps out of component CSS', () => {
    for (const f of files.filter((p) => !p.endsWith('tokens.css'))) {
      const css = readFileSync(f, 'utf8')
      for (const b of blocks(css).filter((x) => x.header.startsWith('@media'))) {
        expect(b.body, f).not.toMatch(/entrance/)
      }
      expect(
        Object.keys(customProps(css)).filter((k) => /entrance/.test(k)),
        f,
      ).toEqual([])
    }
  })
})
