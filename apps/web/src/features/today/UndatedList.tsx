import { UNDATED_ROWS, type TodayResponse } from '@onti/shared'
import { useId } from 'react'
import { messages } from '../../messages'
import styles from './UndatedList.module.css'

interface Props {
  undated: TodayResponse['undated']
  /** Phone width: a single link instead of the list. */
  mobile: boolean
  /** A row opens the note view on that note. */
  onOpenNote: (id: string) => void
  /** "+ n more" and the phone link open All notes, as `/` does. */
  onOpenAll: () => void
}

/**
 * R19 · "Without a reminder" in the date column: header, at most 8 one-line rows with their tags
 * below, then "+ n more" only past 8. Nothing at zero, not even the header. Titles and tags are
 * text nodes; no accent (SG2), rows are 44 px buttons with the ink focus ring.
 */
export function UndatedList({ undated, mobile, onOpenNote, onOpenAll }: Props) {
  const headingId = useId()
  if (undated.count === 0) return null
  if (mobile) {
    return (
      <button className={styles.mobile} type="button" onClick={onOpenAll}>
        {messages.undated.mobile(undated.count)}
      </button>
    )
  }
  const more = undated.count - UNDATED_ROWS
  return (
    <section className={styles.group} aria-labelledby={headingId}>
      <h2 className={styles.title} id={headingId}>
        {messages.undated.header(undated.count)}
      </h2>
      <ul className={styles.list}>
        {undated.items.map((item) => (
          <li key={item.id}>
            <button className={styles.row} type="button" onClick={() => onOpenNote(item.id)}>
              <span className={styles.name}>{item.title}</span>
              {item.tags.length === 0 ? null : (
                <span className={styles.tags}>
                  {item.tags.map((tag) => `#${tag.slug}`).join(' ')}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {more > 0 ? (
        <button className={styles.more} type="button" onClick={onOpenAll}>
          {messages.undated.more(more)}
        </button>
      ) : null}
    </section>
  )
}
