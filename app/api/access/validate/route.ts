// app/api/access/validate/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ATHLETE_PHOTOS_BUCKET } from '@/lib/athletePhotos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AccessResult = 'allowed' | 'denied' | 'expired' | 'unknown_card'

type AthleteLite = {
  name: string | null
  email?: string | null
  phone?: string | null
  photo_path?: string | null
}

type CardWithAthlete = {
  id: string
  uid: string
  active: boolean
  athlete_id: string
  athletes?: AthleteLite | AthleteLite[]
}

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}

function todayUTCDateOnly(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getServerClient()
    const body = await req.json().catch(() => ({} as any))

    const rawUID = (body?.cardUID ?? '').toString()
    const cleanedUID = rawUID.replace(/^0+/, '').trim()

    if (!cleanedUID) {
      return Response.json({ ok: false, error: 'cardUID requerido' }, { status: 400 })
    }

    const today = todayUTCDateOnly()

    // 1) Buscar tarjeta activa
    let missingPhotoColumn = false
    const cardSelectWithPhoto = `
        id,
        uid,
        active,
        athlete_id,
        athletes:athletes ( name, email, phone, photo_path )
      `

    let { data: card, error: cardErr } = await supabase
      .from('cards')
      .select(cardSelectWithPhoto)
      .eq('uid', cleanedUID)
      .eq('active', true)
      .maybeSingle<CardWithAthlete>()

    if (cardErr && cardErr.message?.includes('photo_path')) {
      missingPhotoColumn = true
      const fallback = await supabase
        .from('cards')
        .select(`
          id,
          uid,
          active,
          athlete_id,
          athletes:athletes ( name, email, phone )
        `)
        .eq('uid', cleanedUID)
        .eq('active', true)
        .maybeSingle<CardWithAthlete>()
      card = fallback.data
      cardErr = fallback.error
    }

    if (cardErr) throw cardErr

    let result: AccessResult
    let note = ''
    let athlete:
      | {
          id?: string
          name?: string | null
          email?: string | null
          phone?: string | null
          photo_url?: string | null
        }
      | null = null
    let membership:
      | { plan?: string | null; status?: string | null; start_date?: string | null; end_date?: string | null }
      | null = null

    let memberships: { plan?: string | null; status?: string | null; start_date?: string | null; end_date?: string | null }[] = []

    if (!card) {
      // Tarjeta no registrada o inactiva
      result = 'unknown_card'
      note = 'Tarjeta no registrada o inactiva'
    } else {
      const athleteRel = card.athletes
      const athleteObj = Array.isArray(athleteRel) ? athleteRel[0] : athleteRel
      const photoPath = missingPhotoColumn
        ? null
        : (athleteObj as AthleteLite | undefined)?.photo_path ?? null
      const photoUrl = photoPath
        ? supabase.storage.from(ATHLETE_PHOTOS_BUCKET).getPublicUrl(photoPath).data?.publicUrl ?? null
        : null
      athlete = {
        id: card.athlete_id,
        name: athleteObj?.name ?? null,
        email: athleteObj?.email ?? null,
        phone: athleteObj?.phone ?? null,
        photo_url: photoUrl,
      }

      // 2) Buscar membresías del atleta y evaluar vigencia
      const { data: mems, error: memErr } = await supabase
        .from('memberships')
        .select('plan, status, start_date, end_date')
        .eq('athlete_id', card.athlete_id)
      if (memErr) throw memErr
      memberships = mems ?? []

      const parseDate = (value?: string | null) => (value ? new Date(value) : null)

      const activeMems = memberships.filter(m => (m.status ?? 'active') === 'active')
      const covering = activeMems.find(m => {
        const start = parseDate(m.start_date)
        const end = parseDate(m.end_date)
        if (!start || !end) return false
        return start <= today && today <= end
      })

      if (covering) {
        result = 'allowed'
        membership = {
          plan: covering.plan ?? null,
          status: covering.status ?? 'active',
          start_date: covering.start_date ?? null,
          end_date: covering.end_date ?? null,
        }
      } else {
        const expiredMems = activeMems
          .map(m => ({ ...m, end: parseDate(m.end_date) }))
          .filter(m => m.end && m.end < today)

        if (expiredMems.length > 0) {
          result = 'expired'
          const lastExpired = expiredMems.sort((a, b) => (a.end! < b.end! ? 1 : -1))[0]
          membership = {
            plan: lastExpired?.plan ?? null,
            status: lastExpired?.status ?? 'expired',
            start_date: lastExpired?.start_date ?? null,
            end_date: lastExpired?.end_date ?? null,
          }
        } else {
          result = 'denied'
        }
      }
    }

    // 3) Insertar registro en access_logs
    const payload = {
      athlete_id: athlete?.id ?? null,
      card_uid: cleanedUID,
      ts: new Date().toISOString(),
      result,
      note,
    }

    const { data: inserted, error: insErr } = await supabase
      .from('access_logs')
      .insert(payload)
      .select('id, ts')
      .single()

    if (insErr) {
      return Response.json({ ok: false, error: insErr.message, result, uid: cleanedUID }, { status: 500 })
    }

    // 4) Responder al kiosk
    return Response.json({
      ok: result === 'allowed',
      access_id: inserted?.id ?? null,
      ts: inserted?.ts ?? payload.ts,
      result,
      uid: cleanedUID,
      raw_uid: rawUID,
      athlete,
      membership,
      memberships,
      note,
    })
  } catch (err: any) {
    console.error('[access.validate] error:', err)
    return Response.json({ ok: false, error: err?.message ?? 'Unexpected error' }, { status: 500 })
  }
}
