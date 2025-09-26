// lib/supabase/browser.ts
import { createClient } from '@supabase/supabase-js'
import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from './types'

let client: SupabaseClient<Database> | null = null

export function getSupabaseBrowser(): SupabaseClient<Database> {
  if (typeof window === 'undefined') {
    throw new Error('Supabase browser client solo puede usarse en el navegador')
  }

  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anon) {
      throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY')
    }

    client = createClient<Database>(url, anon, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  }

  return client
}
