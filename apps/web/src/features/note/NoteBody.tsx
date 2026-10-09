import { Component, lazy, Suspense, type ReactNode } from 'react'
import styles from './NoteBody.module.css'

/** Loaded on demand (ADR-002): markdown never reaches the main chunk. */
const MarkdownBody = lazy(() => import('./MarkdownBody'))

/** The body as a text node: what shows while the renderer loads and when it cannot load. */
export function PlainBody({ body }: { body: string }) {
  return <div className={styles.plain}>{body}</div>
}

/** A failed chunk import throws at render, so the fallback needs a boundary (nothing may throw). */
class MarkdownBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

export function NoteBody({ body }: { body: string }) {
  const plain = <PlainBody body={body} />
  return (
    <MarkdownBoundary fallback={plain}>
      <Suspense fallback={plain}>
        <MarkdownBody body={body} />
      </Suspense>
    </MarkdownBoundary>
  )
}
