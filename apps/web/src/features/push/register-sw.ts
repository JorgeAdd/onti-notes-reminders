import { env } from '../../lib/env'

/** The slice of `navigator.serviceWorker` this module uses (small enough to fake in tests). */
export interface WorkerContainer {
  register: (
    url: string,
    options: RegistrationOptions,
  ) => Promise<{ update: () => Promise<unknown> }>
}

interface Options {
  /** The public VAPID key; without it push is not configured and no worker is registered. */
  key?: string | undefined
  /** `navigator.serviceWorker`, or `undefined` in a browser without it. */
  serviceWorker?: WorkerContainer | undefined
}

/**
 * Registers the push worker at the root scope and asks the browser to look for a newer one
 * (decision 22). Never throws: the app is fully usable without push.
 */
export async function registerServiceWorker({
  key = env.VITE_VAPID_PUBLIC_KEY,
  serviceWorker = 'serviceWorker' in navigator ? navigator.serviceWorker : undefined,
}: Options = {}): Promise<void> {
  if (!key || !serviceWorker) return
  try {
    const registration = await serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',
    })
    await registration.update()
  } catch {
    // A blocked or failed registration only means no push on this browser.
  }
}
