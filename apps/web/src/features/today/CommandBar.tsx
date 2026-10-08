import { CAPTURE_LIMITS } from '@onti/shared'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { messages } from '../../messages'
import { capturePresets } from './capture-presets'
import { previewCapture, type CaptureSubmit } from './capture-preview'
import styles from './CommandBar.module.css'

interface Props {
  /** Display time: the preview and the saved due time come from the same clock. */
  now: Date
  timezone: string
  /** Typed text to start from (empty on `c`, the failed text after a failed save). */
  draft: string
  /** One line about the last failed save. */
  notice: string | null
  onSubmit: (submit: CaptureSubmit) => void
  onClose: () => void
  /** Phone width: show the preset row that inserts tokens into the draft (SG14). */
  mobile?: boolean
  /** Tag slugs visible on the page, offered as `#slug` chips on mobile. */
  tags?: string[]
}

/**
 * SG9 · the one-line capture bar (`c`). Live italic preview, ↵ saves only a valid title, esc
 * closes. The preview fades in with `--motion-fade`, which is instant under reduced motion.
 */
export function CommandBar({
  now,
  timezone,
  draft,
  notice,
  onSubmit,
  onClose,
  mobile = false,
  tags = [],
}: Props) {
  const [text, setText] = useState(draft)
  const [blocked, setBlocked] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => input.current?.focus(), [])

  const preview = previewCapture(text, now, timezone)

  const insert = (token: string) => {
    setText(
      (current) => `${current === '' || current.endsWith(' ') ? current : `${current} `}${token} `,
    )
    setBlocked(false)
    input.current?.focus()
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (preview.kind === 'ok') onSubmit({ text, capture: preview.capture })
    else setBlocked(true)
  }
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') onClose()
  }
  const hint =
    preview.kind === 'tooLong'
      ? messages.capture.titleTooLong(CAPTURE_LIMITS.titleMax)
      : messages.capture.titleRequired

  return (
    <form className={styles.bar} onSubmit={submit} onKeyDown={onKeyDown}>
      <input
        ref={input}
        className={styles.input}
        aria-label={messages.capture.label}
        placeholder={messages.capture.placeholder}
        value={text}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          setText(event.target.value)
          setBlocked(false)
        }}
      />
      {mobile ? (
        <div className={styles.presets} role="group" aria-label={messages.capture.presets.label}>
          {capturePresets(now, timezone, tags).map((preset) => (
            <button
              key={preset.token}
              type="button"
              className={styles.preset}
              onClick={() => insert(preset.token)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : null}
      {preview.kind === 'ok' ? <p className={styles.preview}>{preview.text}</p> : null}
      {blocked && preview.kind !== 'ok' ? <p className={styles.hint}>{hint}</p> : null}
      {notice === null ? null : (
        <p role="status" className={styles.hint}>
          {notice}
        </p>
      )}
    </form>
  )
}
