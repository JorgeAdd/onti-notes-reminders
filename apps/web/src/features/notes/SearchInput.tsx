import { SEARCH_LIMITS } from '@onti/shared'
import { useEffect, type RefObject } from 'react'
import { messages } from '../../messages'
import styles from './SearchInput.module.css'

interface Props {
  /** Owned by the container so `/` can bring focus back. */
  inputRef: RefObject<HTMLInputElement | null>
  value: string
  onChange: (value: string) => void
  onFocusChange: (focused: boolean) => void
}

/**
 * The search field, the command line of this view (Decision 9): it lives in the dock and has no
 * visible label, so the accessible name comes from the messages. It takes focus on mount.
 */
export function SearchInput({ inputRef, value, onChange, onFocusChange }: Props) {
  useEffect(() => {
    inputRef.current?.focus()
  }, [inputRef])
  return (
    <form role="search" className={styles.bar} onSubmit={(event) => event.preventDefault()}>
      <input
        ref={inputRef}
        className={styles.input}
        aria-label={messages.notes.searchLabel}
        placeholder={messages.notes.searchPlaceholder}
        maxLength={SEARCH_LIMITS.qMax}
        value={value}
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
      />
    </form>
  )
}
