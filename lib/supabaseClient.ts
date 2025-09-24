import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

let browserClient: SupabaseClient | null = null

function getBrowserConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  if (!url) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL (o SUPABASE_URL) en las variables de entorno.')
  }

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  if (!anonKey) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_ANON_KEY (o SUPABASE_ANON_KEY) en las variables de entorno.')
  }

  return { url, anonKey }
}

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    const { url, anonKey } = getBrowserConfig()
    browserClient = createBrowserClient(url, anonKey)
  }

  return browserClient
}

