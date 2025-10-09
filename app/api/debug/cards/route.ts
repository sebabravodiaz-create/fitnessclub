import { NextResponse } from 'next/server'
import { getServiceRoleClient, getServiceRoleConfig } from '@/lib/supabase/service-role'
import { withApiLogging } from '@/lib/logger'

async function handleGet() {
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

    const supabase = getServiceRoleClient(config)
    console.log("DEBUG - Supabase URL:", process.env.NEXT_PUBLIC_SUPABASE_URL)

    const { data, error } = await supabase
      .from('cards')
      .select('uid, active, athlete_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error("DEBUG - error al consultar cards:", error)
      return NextResponse.json({ ok: false, error })
    }

    return NextResponse.json({
      ok: true,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL,
      count: data?.length || 0,
      cards: data
    })
  } catch (err) {
    console.error("DEBUG - error general en /api/debug/cards:", err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

export const GET = withApiLogging(handleGet, {
  successMessage: ({ response }) =>
    response.ok ? 'Debug cards endpoint responded successfully' : `Debug cards endpoint returned status ${response.status}`,
  errorMessage: ({ error }) =>
    error instanceof Error
      ? `Debug cards endpoint failed: ${error.message}`
      : `Debug cards endpoint failed: ${String(error)}`,
})
