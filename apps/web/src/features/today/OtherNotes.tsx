import type { OtherItem } from '@onti/shared'
import { messages } from '../../messages'
import { clockTime, dayLabel } from './format'
import styles from './OtherNotes.module.css'

interface Props {
  items: OtherItem[]
  tag: string
  timezone: string
}

/**
 * R12 · "Other notes with #tag": the matches that are not on the page. Read-only: no focus, no
 * keys, no actions. A dated row shows its date and time; an undated one shows no date text (SG8).
 */
export function OtherNotes({ items, tag, timezone }: Props) {
  const heading = 'other-notes'
  return (
    <section className={styles.section} aria-labelledby={heading}>
      <h2 id={heading} className={styles.title}>
        {messages.filter.others(tag)}
      </h2>
      <ul className={styles.list}>
        {items.map((item) => {
          const when =
            item.dueAt === null
              ? null
              : `${dayLabel(item.dueAt, timezone)} ${clockTime(item.dueAt, timezone)}`
          const title = <span className={styles.name}>{item.title}</span>
          return (
            <li
              key={item.id}
              className={styles.row}
              aria-label={messages.filter.otherLabel(item.title, when)}
            >
              {when === null ? null : <span className={styles.when}>{when}</span>}
              {item.doneAt === null ? title : <s className={styles.done}>{title}</s>}
              <span className={styles.meta}>
                {item.tags.map((t) => (
                  <span key={t.slug}>#{t.slug}</span>
                ))}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
