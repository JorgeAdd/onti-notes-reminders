import { PUSH_ACTIONS, type PushAction } from '@onti/shared'
import { useQueryClient, type QueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { fetchToday, markNoteDone, snoozeNote, UnauthorizedError } from '../../lib/api'
import { DAY_KEYS, dayKey } from '../today/day-view'

/** What a notification tap asks for: an action on one note, as it was when the push was sent. */
interface Request {
  action: PushAction
  noteId: string
  dueAt: number
}

const TODAY = { date: null, tag: null }
const isAction = (value: unknown): value is PushAction =>
  PUSH_ACTIONS.some((action) => action === value)

/** A well-formed request, or `null`: unknown action, no note, or a `due` that is not epoch ms. */
function parse(action: unknown, noteId: unknown, dueAt: unknown): Request | null {
  const due = typeof dueAt === 'string' && /^\d+$/.test(dueAt) ? Number(dueAt) : dueAt
  if (!isAction(action) || typeof noteId !== 'string' || noteId === '') return null
  if (typeof due !== 'number' || !Number.isSafeInteger(due)) return null
  return { action, noteId, dueAt: due }
}

/** Reads `?action&note&due` and removes them from the address first, so a reload never repeats it. */
function takeUrlRequest(): Request | null {
  const url = new URL(location.href)
  const { searchParams } = url
  const request = parse(
    searchParams.get('action'),
    searchParams.get('note'),
    searchParams.get('due'),
  )
  const had = ['action', 'note', 'due'].some((name) => searchParams.has(name))
  for (const name of ['action', 'note', 'due']) searchParams.delete(name)
  if (had) history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`)
  return request
}

/** The message a worker sends (`onti:action`), as a request. */
const fromMessage = (data: unknown): Request | null => {
  if (typeof data !== 'object' || data === null) return null
  const { action, noteId, dueAt } = data as Record<string, unknown>
  return parse(action, noteId, dueAt)
}

interface Props {
  accessToken: string
  /** The API answered 401: the app ends the session. */
  onSessionExpired: () => void
}

/**
 * The app side of a failed notification action (ADR-004 decision 5). The action runs through the
 * normal JWT path ONLY if Today still shows that note open with the notification's `due_at`;
 * otherwise nothing changes and Today simply shows. A replayed tap never acts twice (C15).
 * Also refreshes Today when the worker finished an action itself.
 */
export function PushBridge({ accessToken, onSessionExpired }: Props) {
  const queryClient = useQueryClient()
  const latest = useRef({ accessToken, onSessionExpired })
  useEffect(() => {
    latest.current = { accessToken, onSessionExpired }
  })

  useEffect(() => {
    const run = (request: Request | null) => {
      if (request) void guarded(queryClient, request, latest.current)
    }
    run(takeUrlRequest())
    if (!('serviceWorker' in navigator)) return
    const worker = navigator.serviceWorker
    const onMessage = (event: MessageEvent) => {
      const data: unknown = event.data
      const type =
        typeof data === 'object' && data !== null ? (data as { type?: unknown }).type : null
      if (type === 'onti:refetch') void queryClient.invalidateQueries({ queryKey: DAY_KEYS })
      if (type === 'onti:action') run(fromMessage(data))
    }
    worker.addEventListener('message', onMessage)
    return () => worker.removeEventListener('message', onMessage)
  }, [queryClient])

  return null
}

async function guarded(
  queryClient: QueryClient,
  { action, noteId, dueAt }: Request,
  { accessToken, onSessionExpired }: Props,
) {
  try {
    // Fresh from the server: the guard is about what Today shows now, not what was cached.
    const today = await queryClient.fetchQuery({
      queryKey: dayKey(TODAY),
      queryFn: () => fetchToday(accessToken, TODAY),
      staleTime: 0,
    })
    const note = [...today.carried.flatMap((group) => group.items), ...today.rail].find(
      (item) => item.id === noteId,
    )
    if (!note || note.doneAt !== null || note.dueAt.getTime() !== dueAt) return
    if (action === 'done') await markNoteDone(accessToken, noteId)
    else await snoozeNote(accessToken, noteId, 'hour')
    await queryClient.invalidateQueries({ queryKey: DAY_KEYS })
  } catch (error) {
    if (error instanceof UnauthorizedError) onSessionExpired()
  }
}
