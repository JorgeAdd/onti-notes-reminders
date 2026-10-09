import { useCallback, useEffect, useState } from 'react'
import { env } from '../../lib/env'
import { supabase } from '../../lib/supabase'
import { PushControl } from './PushControl'
import { subscribePush } from './push-api'
import { disablePush, enablePush, readStatus, type PushState } from './push-client'

/** The session now: read at click time, so a refreshed token is never stale (decision 21). */
const session = async () => (await supabase.auth.getSession()).data.session

const accessToken = async () => {
  const current = await session()
  if (!current) throw new Error('No session')
  return current.access_token
}

/** `user:endpoint` pairs already re-posted in this page load (survives a remount of the control). */
const resynced = new Set<string>()

/** Decision 23: a granted, subscribed browser re-posts its subscription once per load. */
async function resync(subscription: PushSubscription) {
  const current = await session()
  if (!current) return
  const id = `${current.user.id}:${subscription.endpoint}`
  if (resynced.has(id)) return
  resynced.add(id)
  await subscribePush(current.access_token, subscription.toJSON()).catch(() => resynced.delete(id))
}

interface Props {
  /** In the phone bar (see PushControl). */
  compact?: boolean
}

/** State and calls of the notification control; hidden when the public key is not configured. */
export function PushContainer({ compact = false }: Props) {
  const key = env.VITE_VAPID_PUBLIC_KEY
  const [state, setState] = useState<PushState | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!key) return
    let live = true
    readStatus()
      .then(async ({ state: next, subscription }) => {
        if (!live) return
        setState(next)
        if (subscription) await resync(subscription)
      })
      .catch(() => live && setState('unsupported'))
    return () => {
      live = false
    }
  }, [key])

  const enable = useCallback(async () => {
    if (!key) return
    setBusy(true)
    setFailed(false)
    try {
      setState(await enablePush(key, accessToken))
    } catch {
      setFailed(true)
      setState((await readStatus()).state)
    } finally {
      setBusy(false)
    }
  }, [key])

  const disable = useCallback(async () => {
    setBusy(true)
    try {
      await disablePush(await accessToken())
      setState('default')
    } catch {
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }, [])

  if (!key || state === null) return null
  return (
    <PushControl
      state={state}
      busy={busy}
      failed={failed}
      compact={compact}
      onEnable={() => void enable()}
      onDisable={() => void disable()}
    />
  )
}
