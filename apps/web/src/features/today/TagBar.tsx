import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { messages } from '../../messages'
import styles from './TagBar.module.css'

interface Props {
  /** Every tag of the account, sorted by slug. */
  tags: { slug: string; name: string }[]
  /** The applied filter, or `null`. */
  active: string | null
  onApply: (slug: string) => void
  onClose: () => void
  /** Phone width: a Clear chip when filtered, and a backdrop that swallows the outside tap. */
  mobile?: boolean
  onClear?: () => void
}

/**
 * Decision 10 · the tag bar in the dock (`#`). Focus lives on the bar itself: Tab and Shift+Tab
 * cycle the highlighted tag (starting at the applied one), ↵ applies it, esc closes and keeps the
 * filter. `aria-pressed` marks the applied tag, `aria-current` the highlighted one.
 */
export function TagBar({ tags, active, onApply, onClose, mobile = false, onClear }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(() =>
    Math.max(
      0,
      tags.findIndex((t) => t.slug === active),
    ),
  )
  useEffect(() => ref.current?.focus(), [])

  const onKeyDown = (event: KeyboardEvent) => {
    const move = (delta: number) => setIndex((index + delta + tags.length) % tags.length)
    if (event.key === 'Tab') move(event.shiftKey ? -1 : 1)
    else if (event.key === 'Enter') onApply(tags[index]!.slug)
    else if (event.key === 'Escape') onClose()
    else return
    event.preventDefault()
  }

  return (
    <>
      {mobile ? (
        // Q3 · transparent and above the page: the outside tap closes the dock, keeps the filter
        // and never reaches a row (so no row sheet opens).
        <div data-testid="tag-backdrop" className={styles.backdrop} onClick={onClose} />
      ) : null}
      <div
        ref={ref}
        role="group"
        aria-label={messages.filter.label}
        tabIndex={-1}
        className={styles.bar}
        onKeyDown={onKeyDown}
      >
        <div className={styles.chips}>
          {tags.map((tag, i) => (
            <button
              key={tag.slug}
              type="button"
              tabIndex={-1}
              className={styles.chip}
              aria-pressed={tag.slug === active}
              aria-current={i === index ? 'true' : undefined}
              onClick={() => onApply(tag.slug)}
            >
              {messages.filter.chip(tag.slug)}
            </button>
          ))}
          {mobile && active !== null && onClear ? (
            <button type="button" tabIndex={-1} className={styles.chip} onClick={onClear}>
              {messages.filter.clear(active)}
            </button>
          ) : null}
        </div>
        {mobile ? null : <p className={styles.hint}>{messages.filter.hint}</p>}
      </div>
    </>
  )
}
