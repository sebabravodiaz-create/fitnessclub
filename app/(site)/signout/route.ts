// app/(site)/signout/route.ts
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST() {
  const cookieStore = cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // ✅ Nuevo shape
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set({ name, value, ...options })
          })
        },
      },
    }
  )

  // Cerrar sesión en Supabase
  await supabase.auth.signOut()

  // Borrar cookie admin_entry y redirigir a /login
  const res = NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'))
  res.cookies.set({
    name: 'admin_entry',
    value: '',
    path: '/admin',
    maxAge: 0,
    sameSite: 'lax',
  })
  return res
}
