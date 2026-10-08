import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

const SRC = join(__dirname, '..', 'src')

export const readSrc = (path: string): string => readFileSync(join(SRC, path), 'utf8')

export interface Block {
  header: string
  body: string
}

/** Top-level `header { body }` blocks of a stylesheet (comments stripped, braces balanced). */
export function blocks(css: string): Block[] {
  const src = css.replace(/\/\*[\s\S]*?\*\//g, '')
  const out: Block[] = []
  let depth = 0
  let from = 0
  let start = 0
  let header = ''
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '{') {
      if (depth === 0) {
        header = src.slice(from, i).trim()
        start = i + 1
      }
      depth++
    } else if (src[i] === '}') {
      depth--
      if (depth === 0) {
        out.push({ header, body: src.slice(start, i) })
        from = i + 1
      }
    }
  }
  return out
}

const declarations = (body: string, prop: RegExp): Record<string, string> =>
  Object.fromEntries(
    [...body.matchAll(new RegExp(`(${prop.source})\\s*:\\s*([^;]+);`, 'g'))].map(
      (m): [string, string] => [m[1] ?? '', (m[2] ?? '').replace(/\s+/g, ' ').trim()],
    ),
  )

export const customProps = (body: string) => declarations(body, /--[\w-]+/)
export const props = (body: string) => declarations(body, /[\w-]+/)

const merge = (list: Block[]): Record<string, string> =>
  list.reduce((acc, b) => ({ ...acc, ...customProps(b.body) }), {})

const MOBILE = '@media (max-width: 640px)'
const REDUCED = '@media (prefers-reduced-motion: reduce)'

/** The `:root` overrides inside one top-level `@media` block of tokens.css. */
const rootIn = (css: string, media: string): Record<string, string> =>
  merge(
    blocks(css)
      .filter((b) => b.header === media)
      .flatMap((b) => blocks(b.body))
      .filter((b) => b.header === ':root'),
  )

export function tokens() {
  const css = readSrc('styles/tokens.css')
  const root = merge(blocks(css).filter((b) => b.header === ':root'))
  return {
    css,
    root,
    mobile: rootIn(css, MOBILE),
    reduced: rootIn(css, REDUCED),
    mobileIndex: css.indexOf(MOBILE),
    reducedIndex: css.indexOf(REDUCED),
  }
}

/** Resolve `var(--x)` chains against a layered token map. */
export function resolve(value: string, map: Record<string, string>): string {
  return value.replace(/var\((--[\w-]+)\)/g, (_, name: string) => {
    const next = map[name]
    if (next === undefined) throw new Error(`unresolved ${name}`)
    return resolve(next, map)
  })
}

export const ms = (value: string): number => parseFloat(value)

/** `from` and `to` declarations of one keyframes block. */
export function keyframes(css: string, name: string) {
  const frames = blocks(blocks(css).find((b) => b.header === `@keyframes ${name}`)!.body)
  const at = (h: string) => props(frames.find((b) => b.header === h)!.body)
  return { from: at('from'), to: at('to') }
}

/** Parsed `animation` shorthand of a rule: name, duration, easing, delay (default 0), fill. */
export function animationOf(css: string, selector: string) {
  const rule = blocks(css).find((b) => b.header === selector)!
  const parts = (props(rule.body)['animation'] ?? '').match(/var\([^)]*\)|\S+/g) ?? []
  const [name, duration, easing, ...rest] = parts
  const fill = rest.pop()
  return { name, duration, easing, delay: rest[0] ?? '0ms', fill }
}

export function cssFiles(dir = SRC): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return cssFiles(path)
    return path.endsWith('.css') ? [path] : []
  })
}
