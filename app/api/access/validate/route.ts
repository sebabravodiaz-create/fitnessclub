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

function toUTCDateOnly(value: string | Date | null | undefined): Date | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
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
    const rawUIDTrimmed = rawUID.trim()
    const cleanedUID = rawUID.replace(/^0+/, '').trim().toUpperCase()
    const sanitizedRawUID = rawUIDTrimmed || '(vacío)'
    const sanitizedCleanedUID = cleanedUID || '(vacío)'

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
    let athlete: { id?: string; name?: string | null; photo_url?: string | null } | null = null
    let membership: { plan?: string | null; end_date?: string | null } | null = null

    if (!card) {
      // Tarjeta no registrada o inactiva
      result = 'unknown_card'
      note = `Tarjeta no registrada o inactiva. UID recibido: ${sanitizedRawUID} (normalizado: ${sanitizedCleanedUID})`
    } else {
      const athleteRel = card.athletes
      const athleteObj = Array.isArray(athleteRel) ? athleteRel[0] : athleteRel
      const photoPath = missingPhotoColumn
        ? null
        : (athleteObj as AthleteLite | undefined)?.photo_path ?? null
      const photoUrl = photoPath
        ? supabase.storage.from(ATHLETE_PHOTOS_BUCKET).getPublicUrl(photoPath).data?.publicUrl ?? null
        : null
      athlete = { id: card.athlete_id, name: athleteObj?.name ?? null, photo_url: photoUrl }

      // 2) Buscar membresías del atleta y evaluar vigencia
      const { data: mems, error: memErr } = await supabase
        .from('memberships')
        .select('plan, status, start_date, end_date')
        .eq('athlete_id', card.athlete_id)
      if (memErr) throw memErr

      const activeMems = (mems ?? []).filter(m => (m.status ?? 'active') === 'active')
      const covering = activeMems.find(m => {
        const start = toUTCDateOnly(m.start_date)
        const end = toUTCDateOnly(m.end_date)
        if (!start || !end) return false
        return start.getTime() <= today.getTime() && today.getTime() <= end.getTime()
      })

      if (covering) {
        result = 'allowed'
        membership = { plan: covering.plan ?? null, end_date: covering.end_date ?? null }
        const plan = membership?.plan ? ` (${membership.plan})` : ''
        note = `Acceso permitido. Membresía vigente${plan}. UID normalizado: ${sanitizedCleanedUID}`
      } else if (activeMems.some(m => {
        const end = toUTCDateOnly(m.end_date)
        return end ? end.getTime() < today.getTime() : false
      })) {
        result = 'expired'
        const lastExpired = activeMems
          .map(m => ({ ...m, end: toUTCDateOnly(m.end_date) }))
          .filter(m => m.end && m.end.getTime() < today.getTime())
          .sort((a, b) => (a.end && b.end ? (a.end < b.end ? 1 : -1) : 0))[0]
        membership = { plan: lastExpired?.plan ?? null, end_date: lastExpired?.end_date ?? null }
        const endDate = membership?.end_date ?? 'sin fecha'
        note = `Membresía expirada al ${endDate}. UID normalizado: ${sanitizedCleanedUID}`
      } else {
        result = 'denied'
        note = `Sin membresía vigente activa a la fecha. UID normalizado: ${sanitizedCleanedUID}`
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

    return Response.json({
      ok: result === 'allowed',
      access_id: inserted?.id ?? null,
      ts: inserted?.ts ?? payload.ts,
      result,
      uid: cleanedUID,
      athlete,
      membership,
      note,
    })
  } catch (err: any) {
    return Response.json({ ok: false, error: err?.message ?? 'Unexpected error' }, { status: 500 })
  }
}
