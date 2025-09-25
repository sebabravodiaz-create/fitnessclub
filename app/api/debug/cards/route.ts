import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

import { getServiceRoleClient, getServiceRoleConfig } from '@/lib/supabase/service-role'
import { userHasRole } from '@/lib/auth/roles'

export async function GET() {
  const enabled = process.env.ENABLE_DEBUG_ENDPOINT === 'true'

  if (!enabled) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  try {
    const config = getServiceRoleConfig()

    if (!config) {
      console.warn('DEBUG - faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json(
        {
          ok: false,
          error: 'missing_supabase_config',
          missing: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
        },
        { status: 503 },
      )
    }

    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!anonKey) {
      console.error('DEBUG - falta NEXT_PUBLIC_SUPABASE_ANON_KEY')
      return NextResponse.json(
        {
          ok: false,
          error: 'missing_supabase_config',
          missing: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
        },
        { status: 503 },
      )
    }

    const cookieStore = cookies()
    const authClient = createServerClient(config.url, anonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    })

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }

    if (!userHasRole(user, 'admin')) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 })
    }

    const supabase = getServiceRoleClient(config)

    const { data, error } = await supabase
      .from('cards')
      .select('uid, active, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('DEBUG - error al consultar cards:', error)
      return NextResponse.json({ ok: false, error: 'query_failed' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      count: data?.length || 0,
      cards: data,
    })
  } catch (err) {
    console.error('DEBUG - error general en /api/debug/cards:', err)
    return NextResponse.json({ ok: false, error: 'unexpected_error' }, { status: 500 })
  }
}
