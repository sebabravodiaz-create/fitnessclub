import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST(req: Request) {
  try {
    const { cardUID } = await req.json()
    if (!cardUID) {
      return NextResponse.json({ ok: false, result: 'missing_uid' }, { status: 400 })
    }

    const cleanedUID = cardUID.replace(/^0+/, '')

    // Buscar tarjeta
    const { data: card } = await supabase
      .from('cards')
      .select('id, uid, active, athlete_id')
      .eq('uid', cleanedUID)
      .eq('active', true)
      .maybeSingle()

    if (!card) {
      return NextResponse.json({ ok: true, result: 'unknown_card', uid: cleanedUID })
    }

    // Buscar atleta
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, name')
      .eq('id', card.athlete_id)
      .maybeSingle()

    if (!athlete) {
      return NextResponse.json({ ok: true, result: 'unknown_card', uid: cleanedUID })
    }

    // Buscar membresía más reciente
    const today = new Date().toISOString().split('T')[0]
    const { data: membership } = await supabase
      .from('memberships')
      .select('id, plan, end_date, status')
      .eq('athlete_id', athlete.id)
      .order('end_date', { ascending: false })
      .limit(1)
      .maybeSingle()

    // Si no hay membresía en absoluto
    if (!membership) {
      return NextResponse.json({
        ok: true,
        result: 'expired',
        uid: cleanedUID,
        athlete,
        membership: null
      })
    }

    // Normalizar status (activo/active)
    const status = (membership.status || '').toLowerCase()

    // Si ya expiró o no está activa
    if (status !== 'active' && status !== 'activo' || membership.end_date < today) {
      return NextResponse.json({
        ok: true,
        result: 'expired',
        uid: cleanedUID,
        athlete,
        membership // 👈 siempre devolvemos el objeto, con end_date
      })
    }

    // Vigente
    return NextResponse.json({
      ok: true,
      result: 'allowed',
      uid: cleanedUID,
      athlete,
      membership
    })

  } catch (err) {
    console.error("Error en /api/access/validate", err)
    return NextResponse.json({ ok: false, result: 'error' }, { status: 500 })
  }
}
