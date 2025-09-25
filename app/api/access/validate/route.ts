import { NextResponse } from 'next/server'
import { getServiceRoleClient, getServiceRoleConfig } from '@/lib/supabase/service-role'

type CardRow = {
  id: string
  uid: string
  active: boolean
  athlete_id: string | null
}

type AthleteRow = {
  id: string
  name: string | null
}

type MembershipRow = {
  id: string
  plan: string | null
  end_date: string
  status: string | null
}

export async function POST(req: Request) {
  try {
    const config = getServiceRoleConfig()

    if (!config) {
      console.error('Error en /api/access/validate: falta configuración de Supabase service role')
      return NextResponse.json(
        {
          ok: false,
          result: 'missing_supabase_config',
          missing: ['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
        },
        { status: 503 },
      )
    }

    const supabase = getServiceRoleClient(config)
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
      .maybeSingle<CardRow>()

    if (!card) {
      return NextResponse.json({ ok: true, result: 'unknown_card', uid: cleanedUID })
    }

    if (!card.athlete_id) {
      return NextResponse.json({ ok: true, result: 'unknown_card', uid: cleanedUID })
    }

    // Buscar atleta
    const { data: athlete } = await supabase
      .from('athletes')
      .select('id, name')
      .eq('id', card.athlete_id)
      .maybeSingle<AthleteRow>()

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
      .maybeSingle<MembershipRow>()

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
