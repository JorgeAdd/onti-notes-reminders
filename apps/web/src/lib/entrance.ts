import { useEffect, useState, type AnimationEvent } from 'react'

// One bit per page load (SG19): the first sheet that mounts plays the entrance, no later one does.
// Module state, not a ref: it must survive Today <-> All notes remounts and sign-in.
let played = false

interface EntranceProps {
  'data-entrance': 'play' | undefined
  onAnimationEnd: (event: AnimationEvent<HTMLElement>) => void
}

/**
 * Props for the sheet root: `data-entrance` for the first sheet of the page load, cleared when the
 * last entrance animation ends so an element that mounts later (the capture bar) never replays.
 * Clearing is invisible: the animations use `backwards` fill.
 */
export function useEntrance(): EntranceProps {
  const [play, setPlay] = useState(() => !played)
  useEffect(() => {
    played = true
  }, [])
  return {
    'data-entrance': play ? 'play' : undefined,
    onAnimationEnd: (event) => {
      // A missing getAnimations (jsdom) counts as finished.
      const running = event.currentTarget
        .getAnimations?.({ subtree: true })
        .some((a) => a.playState === 'running')
      if (!running) setPlay(false)
    },
  }
}

export function resetEntranceForTests(): void {
  played = false
}
