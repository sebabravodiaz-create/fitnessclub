import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabaseServerClient'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const { cardUID } = await req.json()
    if (!cardUID) {
      return NextResponse.json({ ok: false, result: 'missing_uid' }, { status: 400 })
    }

    const supabase = getSupabaseServerClient()
    const cleanedUID = cardUID.replace(/^0+/, '')

    const { data: card, error: cardError } = await supabase
      .from('cards')
      .select('id, uid, active, athlete_id')
      .eq('uid', cleanedUID)
      .eq('active', true)
      .maybeSingle()

    if (cardError) {
      console.error('Error consultando tarjeta', cardError)
      return NextResponse.json({ ok: false, result: 'error' }, { status: 500 })
    }

    if (!card) {
      return NextResponse.json({ ok: true, result: 'unknown_card', uid: cleanedUID })
    }

    const { data: athlete, error: athleteError } = await supabase
      .from('athletes')
      .select('id, name')
      .eq('id', card.athlete_id)
      .maybeSingle()

    if (athleteError) {
      console.error('Error consultando atleta', athleteError)
      return NextResponse.json({ ok: false, result: 'error' }, { status: 500 })
    }

    if (!athlete) {
      return NextResponse.json({ ok: true, result: 'unknown_card', uid: cleanedUID })
    }

    const today = new Date().toISOString().split('T')[0]
    const { data: membership, error: membershipError } = await supabase
      .from('memberships')
      .select('id, plan, end_date, status')
      .eq('athlete_id', athlete.id)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (membershipError) {
      console.error('Error consultando membresía', membershipError)
      return NextResponse.json({ ok: false, result: 'error' }, { status: 500 })
    }

    if (!membership) {
      return NextResponse.json({
        ok: true,
        result: 'expired',
        uid: cleanedUID,
        athlete,
        membership: null,
      })
    }

    const status = (membership.status || '').toLowerCase()
    if ((status !== 'active' && status !== 'activo') || membership.end_date < today) {
      return NextResponse.json({
        ok: true,
        result: 'expired',
        uid: cleanedUID,
        athlete,
        membership,
      })
    }

    return NextResponse.json({
      ok: true,
      result: 'allowed',
      uid: cleanedUID,
      athlete,
      membership,
    })
  } catch (err) {
    console.error('Error en /api/access/validate', err)
    return NextResponse.json({ ok: false, result: 'error' }, { status: 500 })
  }
}

