import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

let serverClient: SupabaseClient | null = null

function getServerConfig() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error('Falta SUPABASE_URL (o NEXT_PUBLIC_SUPABASE_URL) en las variables de entorno del backend.')
  }

  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!serviceKey) {
    throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY (o la clave anónima) en las variables de entorno del backend.')
  }

  return { url, serviceKey }
}

export function getSupabaseServerClient() {
  if (!serverClient) {
    const { url, serviceKey } = getServerConfig()
    serverClient = createClient(url, serviceKey, {
      auth: { persistSession: false },
    })
  }

  return serverClient
}

