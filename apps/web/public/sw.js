/*
 * Service worker for Web Push (slice 6, ADR-004). A plain classic script at the root scope: no
 * bundler, no imports, so the browser can fetch it directly. The payload shape is
 * `pushPayloadSchema` in packages/shared; its copy comes from the server, never from here.
 */
const APP_NAME = 'Notes + Reminders'
const ACTIONS = ['done', 'snooze']

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

/** The payload when it is the object a reminder sends; anything else is `null`. */
async function readPayload(event) {
  try {
    const data = await event.data.json()
    return data !== null && typeof data === 'object' && typeof data.title === 'string' ? data : null
  } catch {
    return null
  }
}

/** Action buttons only where the browser draws them (Safari and iOS report 0 or nothing). */
function buttonsFor(payload) {
  const max = typeof Notification === 'undefined' ? 0 : (Notification.maxActions ?? 0)
  const actions = Array.isArray(payload.actions) ? payload.actions : []
  return actions.slice(0, max)
}

self.addEventListener('push', (event) => {
  event.waitUntil(
    readPayload(event).then((payload) => {
      // An unusable payload still shows something: a silent push is penalised by browsers.
      if (payload === null) return self.registration.showNotification(APP_NAME)
      return self.registration.showNotification(payload.title, {
        body: payload.body,
        tag: payload.tag,
        renotify: true,
        actions: buttonsFor(payload),
        data: {
          noteId: payload.noteId,
          dueAt: payload.dueAt,
          apiUrl: payload.apiUrl,
          token: payload.token,
        },
      })
    }),
  )
})

const windows = () => self.clients.matchAll({ type: 'window', includeUncontrolled: true })

/** Focuses the open app, or opens `url` when there is none. Returns the focused windows. */
async function openApp(url) {
  const open = await windows()
  if (open.length === 0) {
    await self.clients.openWindow(url)
    return []
  }
  await open[0].focus()
  return open
}

/** ADR-004 decision 5: the app runs the action, but only if Today still shows that due_at. */
async function fallback(action, data) {
  const url = `/?action=${action}&note=${data.noteId}&due=${data.dueAt}`
  const open = await openApp(url)
  if (open.length > 0) {
    open[0].postMessage({ type: 'onti:action', action, noteId: data.noteId, dueAt: data.dueAt })
  }
}

async function runAction(action, data) {
  if (typeof data.token !== 'string' || typeof data.apiUrl !== 'string')
    return fallback(action, data)
  try {
    const response = await fetch(`${data.apiUrl}/push-actions/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: data.token }),
    })
    if (!response.ok) return fallback(action, data)
  } catch {
    return fallback(action, data)
  }
  for (const client of await windows()) client.postMessage({ type: 'onti:refetch' })
}

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data ?? {}
  event.waitUntil(ACTIONS.includes(event.action) ? runAction(event.action, data) : openApp('/'))
})
