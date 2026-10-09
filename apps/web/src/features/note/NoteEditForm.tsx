import {
  CAPTURE_LIMITS,
  NOTE_LIMITS,
  parseTagList,
  readDue,
  type NoteDetail,
  type NoteUpdateRequest,
} from '@onti/shared'
import { useEffect, useRef, useState } from 'react'
import { messages } from '../../messages'
import { dueLabel } from '../notes/format'
import { capturePresets } from '../today/capture-presets'
import { describeDue } from '../today/capture-preview'
import styles from './NoteEditForm.module.css'

const edit = messages.note.edit

interface Props {
  note: NoteDetail
  now: Date
  timezone: string
  saving: boolean
  onSave: (patch: NoteUpdateRequest) => void
  /** Leave edit mode without saving (Cancel, `esc`, or nothing changed). */
  onCancel: () => void
}

type Field = 'title' | 'body' | 'tags' | 'reminder'
type Errors = Partial<Record<Field, string>>

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join('\n') === [...b].sort().join('\n')

/**
 * The edit form (Decision 21): raw markdown, a tags field, and one reminder input that reads the
 * capture time grammar. Save sends only what changed; Save is a button, never a shortcut (SG20).
 * `esc` discards, from any field or button inside the form.
 */
export function NoteEditForm({ note, now, timezone, saving, onSave, onCancel }: Props) {
  const titleRef = useRef<HTMLInputElement>(null)
  useEffect(() => titleRef.current?.focus(), [])
  const [title, setTitle] = useState(note.title)
  const [body, setBody] = useState(note.body)
  const [tagsText, setTagsText] = useState(note.tags.map((tag) => `#${tag.slug}`).join(' '))
  const [reminderText, setReminderText] = useState('')
  const [removeReminder, setRemoveReminder] = useState(false)
  const [errors, setErrors] = useState<Errors>({})

  const due = reminderText.trim() === '' ? null : readDue(reminderText, now, timezone)
  const preview = due === null ? null : messages.capture.preview(describeDue(due, now, timezone))

  const change =
    <T,>(field: Field, set: (value: T) => void) =>
    (value: T) => {
      set(value)
      setErrors(({ [field]: _cleared, ...rest }) => rest)
    }
  const typeReminder = (text: string) => {
    change('reminder', setReminderText)(text)
    setRemoveReminder(false)
  }

  const submit = () => {
    const found: Errors = {}
    const trimmed = title.trim()
    if (trimmed === '') found.title = edit.errors.titleRequired
    else if (trimmed.length > CAPTURE_LIMITS.titleMax) {
      found.title = edit.errors.titleTooLong(CAPTURE_LIMITS.titleMax)
    }
    if (body.length > NOTE_LIMITS.bodyMax) {
      found.body = edit.errors.bodyTooLong(NOTE_LIMITS.bodyMax)
    }
    const tags = parseTagList(tagsText)
    if ('error' in tags) {
      found.tags =
        tags.error === 'invalid'
          ? edit.errors.tagsInvalid
          : edit.errors.tagsTooMany(CAPTURE_LIMITS.tagsMax)
    }
    if (reminderText.trim() !== '' && due === null) found.reminder = edit.errors.reminderUnclear
    if (Object.keys(found).length > 0) return setErrors(found)

    const patch: NoteUpdateRequest = {
      ...(trimmed !== note.title && { title: trimmed }),
      ...(body !== note.body && { body }),
      ...('slugs' in tags &&
        !sameSet(
          tags.slugs,
          note.tags.map((tag) => tag.slug),
        ) && { tags: tags.slugs }),
      ...(due !== null && { dueAt: due }),
      ...(removeReminder && note.dueAt !== null && { dueAt: null }),
    }
    if (Object.keys(patch).length === 0) return onCancel()
    onSave(patch)
  }

  const fieldProps = (field: Field) => ({
    'aria-invalid': errors[field] === undefined ? undefined : true,
    'aria-describedby': errors[field] === undefined ? undefined : `${field}-error`,
  })
  const error = (field: Field) =>
    errors[field] === undefined ? null : (
      <p role="alert" id={`${field}-error`} className={styles.error}>
        {errors[field]}
      </p>
    )

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => event.preventDefault()}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
          event.preventDefault()
          onCancel()
        }
      }}
    >
      <label className={styles.field}>
        <span className={styles.label}>{edit.title}</span>
        <input
          ref={titleRef}
          className={styles.input}
          value={title}
          onChange={(event) => change('title', setTitle)(event.target.value)}
          {...fieldProps('title')}
        />
      </label>
      {error('title')}

      <label className={styles.field}>
        <span className={styles.label}>{edit.body}</span>
        <textarea
          className={styles.textarea}
          rows={10}
          value={body}
          onChange={(event) => change('body', setBody)(event.target.value)}
          {...fieldProps('body')}
        />
      </label>
      {error('body')}

      <label className={styles.field}>
        <span className={styles.label}>{edit.tags}</span>
        <input
          className={styles.input}
          value={tagsText}
          placeholder={edit.tagsHint}
          onChange={(event) => change('tags', setTagsText)(event.target.value)}
          {...fieldProps('tags')}
        />
      </label>
      {error('tags')}

      <div className={styles.field}>
        <label className={styles.label} htmlFor="note-reminder">
          {edit.reminder}
        </label>
        <span className={styles.current}>
          {edit.current(
            note.dueAt === null ? messages.note.noReminder : dueLabel(note.dueAt, now, timezone),
          )}
        </span>
        <input
          id="note-reminder"
          className={styles.input}
          value={reminderText}
          placeholder={edit.reminderHint}
          onChange={(event) => typeReminder(event.target.value)}
          {...fieldProps('reminder')}
        />
      </div>
      {error('reminder')}
      {preview === null ? null : <p className={styles.preview}>{preview}</p>}
      {removeReminder ? <p className={styles.preview}>{edit.willRemove}</p> : null}
      <div className={styles.row}>
        {capturePresets(now, timezone, []).map((preset) => (
          <button
            key={preset.token}
            type="button"
            className={styles.button}
            onClick={() => typeReminder(preset.token)}
          >
            {preset.label}
          </button>
        ))}
        {note.dueAt === null ? null : (
          <button
            type="button"
            className={styles.button}
            onClick={() => {
              setReminderText('')
              setRemoveReminder(true)
            }}
          >
            {edit.removeReminder}
          </button>
        )}
      </div>

      <div className={styles.row}>
        <button type="button" className={styles.save} disabled={saving} onClick={submit}>
          {edit.save}
        </button>
        <button type="button" className={styles.button} onClick={onCancel}>
          {edit.cancel}
        </button>
      </div>
    </form>
  )
}
