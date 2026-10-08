import {
  applyReminderChange,
  type NoteResponse,
  type SnoozePreset,
  type TodayResponse,
} from '@onti/shared'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import { ApiError, UnauthorizedError } from '../../../lib/api'
import { messages } from '../../../messages'

/** The server calls the actions use (src/lib/api.ts binds them to the session token). */
export interface ReminderApi {
  snooze: (id: string, preset: SnoozePreset) => Promise<NoteResponse>
  done: (id: string) => Promise<NoteResponse>
  undo: (id: string) => Promise<NoteResponse>
}

type Action =
  | { type: 'snooze'; id: string; preset: SnoozePreset }
  | { type: 'done'; id: string }
  | { type: 'undo'; id: string }

interface Options {
  api: ReminderApi
  /** Display time (skewed device clock): the same input the server's stamp is predicted from. */
  now: Date
  /** The API answered 401: the app ends the session (Decision 10). */
  onSessionExpired: () => void
}

interface Context {
  previous: TodayResponse | undefined
  title: string | undefined
}

const TODAY = ['today']

const titleOf = (today: TodayResponse | undefined, id: string) =>
  [...(today?.carried.flatMap((group) => group.items) ?? []), ...(today?.rail ?? [])].find(
    (item) => item.id === id,
  )?.title

function describeFailure(error: unknown, action: Action['type'], title: string | undefined) {
  if (title === undefined) return messages.errors.generic
  if (error instanceof ApiError && error.status === 409)
    return messages.errors.actionConflict(title)
  if (error instanceof ApiError && error.status === 404) return messages.errors.actionMissing(title)
  return messages.errors.actionFailed(action, title)
}

/**
 * Snooze, done and undo with an optimistic page (Decisions 8-11). Writes share one scope so they
 * reach the server one at a time, in order; `retry: 0` because snooze is not idempotent. A failure
 * restores the snapshot and says so in one line; the page refetches when the last write settles.
 */
export function useReminderActions({ api, now, onSessionExpired }: Options) {
  const queryClient = useQueryClient()
  const [message, setMessage] = useState<string | null>(null)
  const expiredReported = useRef(false)

  const mutation = useMutation<NoteResponse, Error, Action, Context>({
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
      }
    },
    onMutate: async (action) => {
      await queryClient.cancelQueries({ queryKey: TODAY })
      const previous = queryClient.getQueryData<TodayResponse>(TODAY)
      if (previous) {
        queryClient.setQueryData(TODAY, applyReminderChange(previous, action, now))
      }
      return { previous, title: titleOf(previous, action.id) }
    },
    onSuccess: (note) => {
      const current = queryClient.getQueryData<TodayResponse>(TODAY)
      if (current) {
        const settled = applyReminderChange(
          current,
          { type: 'insert', note, replacesId: note.id },
          now,
        )
        queryClient.setQueryData(TODAY, settled)
      }
    },
    onError: (error, action, context) => {
      if (context?.previous) queryClient.setQueryData(TODAY, context.previous)
      if (error instanceof UnauthorizedError) {
        if (!expiredReported.current) onSessionExpired()
        expiredReported.current = true
        return
      }
      setMessage(describeFailure(error, action.type, context?.title))
    },
    onSettled: () => {
      // A refetch while another write is queued would overwrite its optimistic patch.
      if (queryClient.isMutating({ mutationKey: ['today-write'] }) === 1) {
        void queryClient.invalidateQueries({ queryKey: TODAY })
      }
    },
  })

  return {
    snooze: (id: string, preset: SnoozePreset) => mutation.mutate({ type: 'snooze', id, preset }),
    done: (id: string) => mutation.mutate({ type: 'done', id }),
    undo: (id: string) => mutation.mutate({ type: 'undo', id }),
    message,
    dismiss: () => setMessage(null),
  }
}
