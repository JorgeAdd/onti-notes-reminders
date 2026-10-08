import {
  applyReminderChange,
  type CaptureRequest,
  type NoteResponse,
  type ReminderChange,
  type SnoozePreset,
  type TodayResponse,
} from '@onti/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { ApiError, UnauthorizedError } from '../../../lib/api'
import { messages } from '../../../messages'
import type { CaptureSubmit } from '../capture-preview'
import { DAY_KEYS, dayKey, type DayView } from '../day-view'

/** The server calls the actions use (src/lib/api.ts binds them to the session token). */
export interface ReminderApi {
  snooze: (id: string, preset: SnoozePreset) => Promise<NoteResponse>
  done: (id: string) => Promise<NoteResponse>
  undo: (id: string) => Promise<NoteResponse>
  capture: (payload: CaptureRequest) => Promise<NoteResponse>
}

const PENDING_PREFIX = 'pending-'

/** A captured row not yet confirmed by the server: it has a temporary id and no actions. */
export const isPendingId = (id: string) => id.startsWith(PENDING_PREFIX)

type Action =
  | { type: 'snooze'; id: string; preset: SnoozePreset }
  | { type: 'done'; id: string }
  | { type: 'undo'; id: string }
  | { type: 'capture'; tempId: string; submit: CaptureSubmit }

interface Options {
  api: ReminderApi
  /** Display time (skewed device clock): the same input the server's stamp is predicted from. */
  now: Date
  /** The viewed day and tag: the cache entry a write patches (Decision 7). */
  view: DayView
  /** The API answered 401: the app ends the session (Decision 10). */
  onSessionExpired: () => void
  /** A capture failed: the bar reopens with the typed text and the one-line message. */
  onCaptureFailed?: ((text: string, message: string) => void) | undefined
}

/** The write and the cache entry it started on: a later navigation never moves it. */
type Write = Action & { key: ReturnType<typeof dayKey> }

interface Context {
  previous: TodayResponse | undefined
  title: string | undefined
}

const titleOf = (today: TodayResponse | undefined, id: string) =>
  [...(today?.carried.flatMap((group) => group.items) ?? []), ...(today?.rail ?? [])].find(
    (item) => item.id === id,
  )?.title

function describeFailure(error: unknown, action: Action['type'], title: string | undefined) {
  if (title === undefined) return messages.errors.generic
  if (action === 'capture') return messages.errors.captureFailed(title)
  if (error instanceof ApiError && error.status === 409)
    return messages.errors.actionConflict(title)
  if (error instanceof ApiError && error.status === 404) return messages.errors.actionMissing(title)
  return messages.errors.actionFailed(action, title)
}

/** The optimistic page change for an action; a capture inserts a row under its temporary id. */
function change(action: Action): ReminderChange {
  if (action.type !== 'capture') return action
  const { title, tags, dueAt } = action.submit.capture
  return {
    type: 'insert',
    note: {
      id: action.tempId,
      title,
      tags,
      dueAt,
      originalDueAt: dueAt,
      snoozeCount: 0,
      doneAt: null,
    },
  }
}

/**
 * Snooze, done, undo and capture with an optimistic page (Decisions 8-11). Writes share one scope so they
 * reach the server one at a time, in order; `retry: 0` because snooze is not idempotent. A failure
 * restores the snapshot and says so in one line; the page refetches when the last write settles.
 */
export function useReminderActions({ api, now, view, onSessionExpired, onCaptureFailed }: Options) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const expiredReported = useRef(false)
  const pendingCount = useRef(0)

  const mutation = useMutation<NoteResponse, Error, Write, Context>({
    mutationKey: ['today-write'],
    scope: { id: 'today' },
    retry: 0,
    mutationFn: (action) => {
      switch (action.type) {
        case 'snooze':
          return api.snooze(action.id, action.preset)
        case 'done':
          return api.done(action.id)
        case 'undo':
          return api.undo(action.id)
        case 'capture': {
          const { capture } = action.submit
          return api.capture({
            title: capture.title,
            tags: capture.tags.map((tag) => tag.slug),
            dueAt: capture.dueAt,
          })
        }
      }
    },
    onMutate: async (action) => {
      const { key } = action
      // A capture while the viewed day still loads: no data under the key, so nothing to cancel
      // (that would drop the load) or patch; settling refetches.
      let previous: TodayResponse | undefined
      if (queryClient.getQueryData(key) !== undefined) {
        await queryClient.cancelQueries({ queryKey: key })
        previous = queryClient.getQueryData<TodayResponse>(key)
        if (previous)
          queryClient.setQueryData(key, applyReminderChange(previous, change(action), now))
        // A cached neighbour day would show the old position of the item for a moment.
        queryClient.removeQueries({ queryKey: DAY_KEYS, type: 'inactive' })
      }
      return {
        previous,
        title:
          action.type === 'capture' ? action.submit.capture.title : titleOf(previous, action.id),
      }
    },
    onSuccess: (note, action) => {
      const current = queryClient.getQueryData<TodayResponse>(action.key)
      if (current) {
        const settled = applyReminderChange(
          current,
          { type: 'insert', note, replacesId: action.type === 'capture' ? action.tempId : note.id },
          now,
        )
        queryClient.setQueryData(action.key, settled)
      }
    },
    onError: (error, action, context) => {
      if (context?.previous) queryClient.setQueryData(action.key, context.previous)
      if (error instanceof UnauthorizedError) {
        if (!expiredReported.current) onSessionExpired()
        expiredReported.current = true
        return
      }
      const failure = describeFailure(error, action.type, context?.title)
      if (action.type === 'capture') onCaptureFailed?.(action.submit.text, failure)
      else setMessage(failure)
    },
    onSettled: () => {
      // A refetch while another write is queued would overwrite its optimistic patch.
      if (queryClient.isMutating({ mutationKey: ['today-write'] }) === 1) {
        void queryClient.invalidateQueries({ queryKey: DAY_KEYS })
      }
    },
  })

  return {
    snooze: (id: string, preset: SnoozePreset) =>
      mutation.mutate({ type: 'snooze', id, preset, key: dayKey(view) }),
    done: (id: string) => mutation.mutate({ type: 'done', id, key: dayKey(view) }),
    undo: (id: string) => mutation.mutate({ type: 'undo', id, key: dayKey(view) }),
    capture: (submit: CaptureSubmit) =>
      mutation.mutate({
        type: 'capture',
        tempId: `${PENDING_PREFIX}${pendingCount.current++}`,
        submit,
        key: dayKey(view),
      }),
    message,
    dismiss: () => setMessage(null),
  }
}
