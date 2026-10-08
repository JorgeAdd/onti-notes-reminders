import { useEffect, useState } from 'react'

// One bit per page load (SG19): the first sheet that mounts plays the entrance, no later one does.
// Module state, not a ref: it must survive Today <-> All notes remounts and sign-in.
let played = false

/** `'play'` for the first sheet of the page load, else `undefined`. Stable for the sheet's life. */
export function useEntrance(): 'play' | undefined {
  const [play] = useState(() => !played)
  useEffect(() => {
    played = true
  }, [])
  return play ? 'play' : undefined
}

export function resetEntranceForTests(): void {
  played = false
}
