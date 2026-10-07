import { createClient } from '@supabase/supabase-js'
import { env } from './env'

/** Used for authentication only. Data goes through our API (ADR-001). */
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_PUBLISHABLE_KEY)
