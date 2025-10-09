import { createClient } from '@supabase/supabase-js'
import { ATHLETE_PHOTOS_BUCKET } from '@/lib/athletePhotos'
import { CARD_UID_LENGTH } from '@/lib/kiosk/cardValidation'

export type AccessResult = 'allowed' | 'denied' | 'expired' | 'unknown_card'

export type AthleteLite = {
  name: string | null
  email?: string | null
  phone?: string | null
  photo_path?: string | null
}

export type CardWithAthlete = {
  id: string
  uid: string
  active: boolean
  athlete_id: string
  athletes?: AthleteLite | AthleteLite[]
}

export type AccessValidation = {
  ok: boolean
  access_id: string | null
  ts: string
  result: AccessResult | 'validation_error' | 'error'
  uid: string
  raw_uid: string
  athlete: {
    id?: string
    name?: string | null
    email?: string | null
    phone?: string | null
    photo_url?: string | null
  } | null
  membership: { plan?: string | null; status?: string | null; start_date?: string | null; end_date?: string | null } | null
  memberships: { plan?: string | null; status?: string | null; start_date?: string | null; end_date?: string | null }[]
  note: string
  validation?: {
    status: 'OK' | 'UNRECOGNIZED' | 'VALIDATION_ERROR'
    reason?: string
    expected_length?: number
  }
}

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient(url, key, { auth: { persistSession: false } })
}

function todayUTCDateOnly(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

export async function validateCardAccess(
  cardUID: string,
  rawUID: string,
  options?: { normalizedUID?: string },
): Promise<AccessValidation> {
  const supabase = getServerClient()
  const today = todayUTCDateOnly()

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

  const normalizedUID = options?.normalizedUID ?? cardUID

  let validation: AccessValidation['validation'] = {
    status: 'OK',
    reason: 'matched_in_db',
    expected_length: CARD_UID_LENGTH,
  }

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
    .eq('uid', cardUID)
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
      .eq('uid', cardUID)
      .eq('active', true)
      .maybeSingle<CardWithAthlete>()
    card = fallback.data
    cardErr = fallback.error
  }

  if (cardErr) throw cardErr

  if (!card) {
    result = 'unknown_card'
    note = 'Tarjeta no registrada o inactiva'
    validation = {
      status: 'UNRECOGNIZED',
      reason: 'not_found_in_db',
      expected_length: CARD_UID_LENGTH,
    }
  } else {
    const athleteRel = card.athletes
    const athleteObj = Array.isArray(athleteRel) ? athleteRel[0] : athleteRel
    const photoPath = missingPhotoColumn ? null : (athleteObj as AthleteLite | undefined)?.photo_path ?? null
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

    const { data: mems, error: memErr } = await supabase
      .from('memberships')
      .select('plan, status, start_date, end_date')
      .eq('athlete_id', card.athlete_id)
    if (memErr) throw memErr
    memberships = (mems ?? []).slice().sort((a, b) => {
      const aTime = a.start_date ? new Date(a.start_date).getTime() : 0
      const bTime = b.start_date ? new Date(b.start_date).getTime() : 0
      return bTime - aTime
    })

    const parseDate = (value?: string | null) => (value ? new Date(value) : null)

    const normalizeStatus = (status?: string | null) => (status ?? 'active').toLowerCase()

    const activeMems = memberships.filter(m => normalizeStatus(m.status) === 'active')
    const soldMems = memberships.filter(m => normalizeStatus(m.status) === 'sold')
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
      } else if (soldMems.length > 0) {
        result = 'expired'
        const lastSold = soldMems
          .slice()
          .sort((a, b) => {
            const aTime = parseDate(a.end_date ?? a.start_date ?? undefined)?.getTime() ?? 0
            const bTime = parseDate(b.end_date ?? b.start_date ?? undefined)?.getTime() ?? 0
            return bTime - aTime
          })[0]
        membership = {
          plan: lastSold?.plan ?? null,
          status: lastSold?.status ?? 'sold',
          start_date: lastSold?.start_date ?? null,
          end_date: lastSold?.end_date ?? null,
        }
      } else {
        result = 'denied'
      }
    }
  }

  const payload = {
    athlete_id: athlete?.id ?? null,
    card_uid: cardUID,
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
    throw new Error(insErr.message)
  }

  return {
    ok: result === 'allowed',
    access_id: inserted?.id ?? null,
    ts: inserted?.ts ?? payload.ts,
    result,
    uid: normalizedUID,
    raw_uid: rawUID,
    athlete,
    membership,
    memberships,
    note,
    validation,
  }
}
