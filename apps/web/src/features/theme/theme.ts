// The three-state theme override (SG18). The inline script in index.html applies the stored value
// before first paint with the same key and parse rule; test/theme-script.test.ts keeps them equal.
export type ThemeChoice = 'system' | 'light' | 'dark'

export const THEME_KEY = 'onti.theme'

/** Only `light` and `dark` are choices; anything else, including null, is System. */
export function themeFromStored(raw: string | null): ThemeChoice {
  return raw === 'light' || raw === 'dark' ? raw : 'system'
}

/** The theme the page shows now (the control reads the page, not storage). */
export function appliedTheme(root: HTMLElement): ThemeChoice {
  return themeFromStored(root.getAttribute('data-theme'))
}

/** System removes the attribute, so the stylesheet follows `prefers-color-scheme`. */
export function applyTheme(choice: ThemeChoice, root: HTMLElement): void {
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)
}

/** Persist the choice. A blocked or full storage is not an error: the choice still applies. */
export function storeTheme(
  choice: ThemeChoice,
  storage?: Pick<Storage, 'setItem' | 'removeItem'> | null,
): void {
  try {
    const target = storage === undefined ? localStorage : storage
    if (choice === 'system') target?.removeItem(THEME_KEY)
    else target?.setItem(THEME_KEY, choice)
  } catch {
    // Applies to the open page only; the next load follows the system.
  }
}
