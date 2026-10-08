import { useId, useState } from 'react'
import { messages } from '../../messages'
import styles from './ThemeControl.module.css'
import { appliedTheme, applyTheme, storeTheme, type ThemeChoice } from './theme'

const t = messages.theme
const OPTIONS: readonly (readonly [ThemeChoice, string])[] = [
  ['system', t.system],
  ['light', t.light],
  ['dark', t.dark],
]

/** System / Light / Dark (SG18). Reads the page, not storage, so a failed write keeps the choice. */
export function ThemeControl() {
  const name = useId()
  const [choice, setChoice] = useState<ThemeChoice>(() => appliedTheme(document.documentElement))

  function select(next: ThemeChoice) {
    setChoice(next)
    applyTheme(next, document.documentElement)
    storeTheme(next)
  }

  return (
    <div className={styles.group} role="radiogroup" aria-label={t.label}>
      {OPTIONS.map(([value, label]) => (
        <label key={value} className={styles.option}>
          <input
            className={styles.input}
            type="radio"
            name={name}
            checked={choice === value}
            onChange={() => select(value)}
          />
          <span className={styles.face}>{label}</span>
        </label>
      ))}
    </div>
  )
}
