/** Slice 9 · SG13, SG15, SG16: tokens only, fade only, 44 px, ink focus [static scan of the help CSS]. */
import { describe, expect, it } from 'vitest'
import { blocks, ms, props, readSrc, resolve, tokens } from './css-tokens'

const FILES = ['features/help/HelpDialog.module.css', 'features/help/HelpContent.module.css']
const sheets = FILES.map((file) => ({ file, css: readSrc(file) }))
const stripped = (css: string) => css.replace(/\/\*[\s\S]*?\*\//g, '')

/** The declarations of every rule whose selector list names `selector`, merged. */
const ruleBody = (css: string, selector: string) => {
  const rules = blocks(css).filter((b) => b.header.split(',').some((h) => h.trim() === selector))
  if (rules.length === 0) throw new Error(`no rule ${selector}`)
  return Object.assign({}, ...rules.map((rule) => props(rule.body))) as Record<string, string>
}

describe('help CSS · tokens only (rule 8)', () => {
  it.each(sheets)('$file has no core token, raw hex, px font size or raw duration', ({ css }) => {
    const code = stripped(css)
    expect(code).not.toMatch(/--core-/)
    expect(code).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(code).not.toMatch(/font-size\s*:/)
    expect(code).not.toMatch(/\b\d*\.?\d+(ms|s)\b/)
    expect(code).not.toMatch(/\bfont\s*:\s*(?!\s|var\()/)
  })

  it.each(sheets)('$file never uses the date vermilion (rule 9)', ({ css }) => {
    expect(stripped(css)).not.toMatch(/--color-date/)
  })
})

describe('help CSS · motion (rule 10, SG15, SG16)', () => {
  const all = sheets.map((s) => stripped(s.css)).join('\n')
  const { root, reduced } = tokens()

  it('animates only opacity: no keyframe sets another property', () => {
    const frames = blocks(all).filter((b) => b.header.startsWith('@keyframes'))
    expect(frames.length).toBeGreaterThan(0)
    for (const frame of frames)
      for (const step of blocks(frame.body))
        expect(Object.keys(props(step.body))).toEqual(['opacity'])
    expect(all).not.toMatch(/\btransform\s*:|\btransition\s*:/)
  })

  it('fades with --motion-* and --ease-paper, at most 150 ms in both modes', () => {
    const animated = blocks(all).filter((b) => props(b.body)['animation'] !== undefined)
    expect(animated.length).toBeGreaterThan(0)
    for (const rule of animated) {
      const animation = props(rule.body)['animation']!
      expect(animation).toMatch(/var\(--motion-[\w-]+\)/)
      expect(animation).toContain('var(--ease-paper)')
      const duration = /var\(--motion-[\w-]+\)/.exec(animation)![0]
      expect(ms(resolve(duration, root))).toBeLessThanOrEqual(150)
      expect(ms(resolve(duration, { ...root, ...reduced }))).toBeLessThanOrEqual(150)
    }
  })

  it('fades the scrim and the dialog', () => {
    for (const selector of ['.scrim', '.card', '.sheet'])
      expect(ruleBody(readSrc(FILES[0]!), selector)).toHaveProperty('animation')
  })
})

describe('help CSS · targets and focus (rule 11, SG13)', () => {
  const dialog = readSrc(FILES[0]!)

  it('makes the close button at least 44 px with the ink focus ring', () => {
    const close = ruleBody(dialog, '.close')
    expect(resolve(close['min-height']!, tokens().root)).toBe('44px')
    expect(resolve(close['min-width']!, tokens().root)).toBe('44px')
    expect(ruleBody(dialog, '.close:focus-visible')['outline']).toBe('var(--focus-ring)')
  })

  it('keeps the header (and the close button) in view on a phone', () => {
    const mobile = blocks(dialog).find((b) => b.header === '@media (max-width: 640px)')!
    expect(props(blocks(mobile.body).find((b) => b.header === '.header')!.body)).toMatchObject({
      position: 'sticky',
      top: '0',
    })
  })

  it('sizes the card from the card token and scrolls inside', () => {
    const card = ruleBody(dialog, '.card')
    expect(card['width']).toContain('var(--size-card-max)')
    expect(card['overflow-y']).toBe('auto')
  })
})
