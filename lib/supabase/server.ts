// src/lib/supabase/server.ts
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente para el servidor o scripts locales.
 * Usa la service_role key -> nunca exponer en el cliente.
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,   // URL del proyecto
  process.env.SUPABASE_SERVICE_ROLE_KEY!,  // service_role key
  {
    auth: {
      persistSession: false,
    },
  }
)
