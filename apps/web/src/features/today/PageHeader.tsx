import { messages } from '../../messages'
import styles from './PageHeader.module.css'

interface Props {
  openCount: number
  anyDone: boolean
}

/** The page's only h1: "4 things today" / "1 thing today" / "3 left today" (R4). */
export function PageHeader({ openCount, anyDone }: Props) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{messages.today.header(openCount, anyDone)}</h1>
    </header>
  )
}
