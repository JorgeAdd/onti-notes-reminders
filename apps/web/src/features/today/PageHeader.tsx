import styles from './PageHeader.module.css'

interface Props {
  /** The words of the header, already decided (R4, R12): see `pageTitle`. */
  title: string
}

/** The page's only h1. */
export function PageHeader({ title }: Props) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
    </header>
  )
}
