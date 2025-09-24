import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabaseServerClient'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = getSupabaseServerClient()

    const { data, error } = await supabase
      .from('cards')
      .select('uid, active, athlete_id, created_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) {
      console.error('DEBUG - error al consultar cards:', error)
      return NextResponse.json({ ok: false, error }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      supabase_url: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL,
      count: data?.length || 0,
      cards: data,
    })
  } catch (err) {
    console.error('DEBUG - error general en /api/debug/cards:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}

