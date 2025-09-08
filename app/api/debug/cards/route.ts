import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function GET() {
  try {
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
