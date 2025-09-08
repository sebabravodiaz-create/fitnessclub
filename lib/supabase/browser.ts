// src/lib/supabase/browser.ts
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente para el navegador (público).
 * Usa la anon key y sirve para leer PDFs, rutinas, etc.
 */
export const supabaseBrowser = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,       // URL del proyecto
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,  // anon key
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
)