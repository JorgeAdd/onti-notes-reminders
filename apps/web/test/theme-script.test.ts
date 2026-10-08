import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, it } from 'vitest'
import { THEME_KEY, themeFromStored } from '../src/features/theme/theme'

const html = readFileSync('index.html', 'utf8')
const head = html.slice(html.indexOf('<head>'), html.indexOf('</head>'))
const scriptTag = /<script(?![^>]*\b(?:src|type)=)[^>]*>([\s\S]*?)<\/script>/.exec(head)
const source = scriptTag?.[1] ?? ''

const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')!
const root = document.documentElement
// The script under test is the page's own text; running it needs the Function constructor.
/* eslint-disable @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
const run = () => new Function(source)()
/* eslint-enable @typescript-eslint/no-implied-eval, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */

const stubStorage = (get: () => unknown) =>
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    get: () => ({ getItem: get }),
  })

afterEach(() => {
  Object.defineProperty(globalThis, 'localStorage', original)
  root.removeAttribute('data-theme')
})

describe('inline theme script in index.html', () => {
  it('is a classic script in the head, before the app entry', () => {
    expect(scriptTag).not.toBeNull()
    expect(head).not.toMatch(/<script[^>]*\b(?:async|defer)\b/)
    expect(html.indexOf(source)).toBeLessThan(html.indexOf('type="module"'))
    expect(source).toContain(THEME_KEY)
    expect(source.length).toBeLessThan(260)
  })

  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
    [null, null],
    ['purple', null],
    ['', null],
    ['Dark', null],
  ])('stored %j sets data-theme to %j', (stored, attribute) => {
    stubStorage(() => stored)
    root.setAttribute('data-theme', 'dark')
    run()
    expect(root.getAttribute('data-theme')).toBe(attribute)
  })

  it('follows the system when getItem throws, the getter throws or storage is missing', () => {
    root.setAttribute('data-theme', 'light')
    stubStorage(() => {
      throw new Error('blocked')
    })
    expect(run).not.toThrow()
    expect(root.hasAttribute('data-theme')).toBe(false)

    root.setAttribute('data-theme', 'light')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get: () => {
        throw new Error('denied')
      },
    })
    expect(run).not.toThrow()
    expect(root.hasAttribute('data-theme')).toBe(false)

    root.setAttribute('data-theme', 'light')
    Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: undefined })
    expect(run).not.toThrow()
    expect(root.hasAttribute('data-theme')).toBe(false)
  })

  it('matches themeFromStored for every stored value', () => {
    for (const stored of ['light', 'dark', null, '', 'sepia', 'LIGHT']) {
      stubStorage(() => stored)
      root.removeAttribute('data-theme')
      run()
      const choice = themeFromStored(stored)
      expect(root.getAttribute('data-theme') ?? 'system').toBe(choice)
    }
  })
})
