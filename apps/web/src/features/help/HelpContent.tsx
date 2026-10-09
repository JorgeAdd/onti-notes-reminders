import { useId } from 'react'
import { messages } from '../../messages'
import type { HelpSection } from './help-model'
import styles from './HelpContent.module.css'

/** The four sections as the model built them; the dialog decides keys or touch. */
export function HelpContent({ sections }: { sections: HelpSection[] }) {
  const base = useId()
  return (
    <div className={styles.content}>
      {sections.map((section) => (
        <section
          key={section.id}
          aria-labelledby={`${base}-${section.id}`}
          className={styles.section}
        >
          <h3 id={`${base}-${section.id}`} className={styles.heading}>
            {section.title}
          </h3>
          <ul className={styles.rows}>
            {section.rows.map((row) => (
              <li key={row.id} className={styles.row}>
                <span className={styles.line}>{row.line}</span>
                {row.detail === undefined ? null : (
                  <span className={styles.detail}>{row.detail}</span>
                )}
              </li>
            ))}
          </ul>
          {section.examples === undefined ? null : (
            <dl className={styles.examples}>
              {section.examples.map((example) => (
                <div key={example.input} className={styles.example}>
                  <dt>
                    <code className={styles.input}>{example.input}</code>
                  </dt>
                  <dd className={styles.shows}>{example.shows}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      ))}
      <p className={styles.soon}>{messages.help.comingInV2}</p>
    </div>
  )
}
