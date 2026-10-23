import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Copy .env.example to .env and set ' +
      'VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

/** Append-only audit trail. Never throws, so it can't break the main flow. */
export async function logAudit({ action, entityType, entityId = null, details = {} }) {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    const role = user?.app_metadata?.role ?? 'anon'
    const { error } = await supabase.from('audit_logs').insert({
      actor_id: user?.id ?? null,
      actor_role: role,
      action,
      entity_type: entityType,
      entity_id: entityId,
      details,
    })
    if (error) console.warn('[audit]', error.message)
  } catch (e) {
    console.warn('[audit]', e)
  }
}