import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  THEME_KEY,
  appliedTheme,
  applyTheme,
  storeTheme,
  themeFromStored,
} from '../src/features/theme/theme'

afterEach(() => {
  document.documentElement.removeAttribute('data-theme')
  vi.unstubAllGlobals()
})

const root = () => document.documentElement
const throwing = () => {
  throw new Error('storage blocked')
}

describe('themeFromStored', () => {
  it.each([
    ['light', 'light'],
    ['dark', 'dark'],
    [null, 'system'],
    ['', 'system'],
    ['sepia', 'system'],
    ['LIGHT', 'system'],
    ['Dark', 'system'],
  ] as const)('reads %j as %s', (raw, choice) => {
    expect(themeFromStored(raw)).toBe(choice)
  })
})

describe('applyTheme and appliedTheme', () => {
  it('sets data-theme for light and dark and removes it for system', () => {
    applyTheme('dark', root())
    expect(root().getAttribute('data-theme')).toBe('dark')
    expect(appliedTheme(root())).toBe('dark')
    applyTheme('light', root())
    expect(root().getAttribute('data-theme')).toBe('light')
    applyTheme('system', root())
    expect(root().hasAttribute('data-theme')).toBe(false)
    expect(appliedTheme(root())).toBe('system')
  })

  it('reads an unknown attribute as system', () => {
    root().setAttribute('data-theme', 'purple')
    expect(appliedTheme(root())).toBe('system')
  })
})

describe('storeTheme', () => {
  it('writes light and dark under the shared key and removes it for system', () => {
    const setItem = vi.fn()
    const removeItem = vi.fn()
    storeTheme('dark', { setItem, removeItem })
    storeTheme('light', { setItem, removeItem })
    storeTheme('system', { setItem, removeItem })
    expect(THEME_KEY).toBe('onti.theme')
    expect(setItem.mock.calls).toEqual([
      [THEME_KEY, 'dark'],
      [THEME_KEY, 'light'],
    ])
    expect(removeItem.mock.calls).toEqual([[THEME_KEY]])
  })

  it('swallows a throwing setItem, a throwing removeItem and a missing storage', () => {
    expect(() => storeTheme('dark', { setItem: throwing, removeItem: vi.fn() })).not.toThrow()
    expect(() => storeTheme('system', { setItem: vi.fn(), removeItem: throwing })).not.toThrow()
    expect(() => storeTheme('dark', null)).not.toThrow()
  })

  it('uses localStorage by default, and survives it being unavailable', () => {
    storeTheme('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
    storeTheme('system')
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
    vi.stubGlobal('localStorage', undefined)
    expect(() => storeTheme('dark')).not.toThrow()
  })
})
