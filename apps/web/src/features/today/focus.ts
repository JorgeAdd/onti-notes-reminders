import type { TodayResponse } from '@onti/shared'
import { useState } from 'react'

/** The flat order the keys walk: carried (oldest day, then time), then the rail. */
export function orderedIds(today: TodayResponse): string[] {
  const carried = today.carried.flatMap((group) =>
    [...group.items].sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime()),
  )
  return [...carried, ...today.rail].map((item) => item.id)
}

/** j/k: one row, no wrap. With nothing focused, j lands on the first row and k on the last. */
export function step(ids: string[], focusedId: string | null, delta: 1 | -1): string | null {
  const index = focusedId === null ? -1 : ids.indexOf(focusedId)
  if (index === -1) return (delta === 1 ? ids[0] : ids[ids.length - 1]) ?? null
  return ids[Math.min(Math.max(index + delta, 0), ids.length - 1)] ?? null
}

/** The row that left the page hands focus to the next row still there, else the previous. */
export function afterRemoval(before: string[], after: string[], removedId: string): string | null {
  const index = before.indexOf(removedId)
  const stays = (id: string) => after.includes(id)
  return before.slice(index + 1).find(stays) ?? before.slice(0, index).reverse().find(stays) ?? null
}

/** Focus by note id, so an optimistic patch that reorders rows cannot move it (Decision 13). */
export function useFocus(ids: string[], pageKey?: string) {
  const [state, setState] = useState<{
    focusedId: string | null
    ids: string[]
    pageKey: string | undefined
  }>({ focusedId: null, ids, pageKey })
  let focusedId = state.focusedId
  // The page changed: adjust while rendering (same pattern as use-now) rather than in an effect.
  if (state.ids !== ids || state.pageKey !== pageKey) {
    if (state.pageKey !== undefined && pageKey !== state.pageKey) {
      // Another day: the keys start again from its first row.
      focusedId = ids[0] ?? null
    } else if (focusedId !== null && !ids.includes(focusedId)) {
      focusedId = afterRemoval(state.ids, ids, focusedId)
    }
    setState({ focusedId, ids, pageKey })
  }
  return {
    focusedId,
    tabStopId: focusedId ?? ids[0] ?? null,
    setFocusedId: (id: string | null) => setState({ focusedId: id, ids, pageKey }),
  }
}
