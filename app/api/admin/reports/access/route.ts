import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withApiLogging } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AccessRow = {
  fecha: string
  socio: string | null
  email: string | null
  phone: string | null
  tarjeta_uid: string | null
  estado: string
  plan_vigente: string | null
  plan_inicio: string | null
  plan_fin: string | null
  nota: string | null
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return 'mensaje\nNo se encontraron registros.'
  const header = Object.keys(rows[0])
  const escape = (val: unknown) => {
    if (val === null || val === undefined) return ''
    const s = String(val)
    const needsQuotes = /[",\n]/.test(s)
    const escaped = s.replace(/"/g, '""')
    return needsQuotes ? `"${escaped}"` : escaped
  }
  const csvRows = rows.map((row) => header.map((k) => escape(row[k])).join(','))
  return [header.join(','), ...csvRows].join('\n')
}

function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!
  if (!url || !key) throw new Error('Faltan variables de entorno de Supabase.')
  return createClient(url, key, { auth: { persistSession: false } })
}

function parseDateRange(from?: string | null, to?: string | null) {
  const isoFrom = from ? new Date(`${from}T00:00:00.000Z`).toISOString() : null
  const isoTo = to ? new Date(`${to}T23:59:59.999Z`).toISOString() : null
  return { isoFrom, isoTo }
}

// 👇 Mapeo de alias (UI) → labels reales del enum
const STATUS_FILTERS: Record<string, string | string[]> = {
  ok: 'allowed',
  nok: ['denied', 'expired'],
  denied: 'denied',
  expired: 'expired',
  unknown_card: 'unknown_card',
}

// GET /api/admin/reports/access?status=ok|nok|denied|expired|unknown_card&from=YYYY-MM-DD&to=YYYY-MM-DD&limit=5000
async function handleGet(req: NextRequest) {
  try {
    const supabase = getServerClient()
    const url = new URL(req.url)

    const requested = (url.searchParams.get('status') ?? '').toLowerCase().trim()
    const mapped = requested && STATUS_FILTERS[requested] ? STATUS_FILTERS[requested] : null

    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const limit = Math.min(Number(url.searchParams.get('limit')) || 5000, 50000)
    const { isoFrom, isoTo } = parseDateRange(from, to)

    // 1) access_logs
    let q = supabase
      .from('access_logs')
      .select('id, ts, result, note, card_uid, athlete_id')
      .order('ts', { ascending: false })
      .limit(limit)

    if (Array.isArray(mapped)) q = q.in('result', mapped)
    else if (mapped) q = q.eq('result', mapped)
    if (isoFrom) q = q.gte('ts', isoFrom)
    if (isoTo) q = q.lte('ts', isoTo)

    const { data: logs, error: logsErr } = await q
    if (logsErr) throw logsErr

    if (!logs?.length) {
      const csv = toCsv([])
      const fileName = `reporte_accesos_${requested || 'todos'}${from ? `_${from}` : ''}${to ? `_${to}` : ''}.csv`
      return new Response(`\uFEFF${csv}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    // 2) athletes
    const athleteIds = Array.from(new Set(logs.map((l) => l.athlete_id).filter(Boolean))) as string[]
    const athletesById: Record<string, { name: string | null; email: string | null; phone: string | null }> = {}
    if (athleteIds.length) {
      const { data: athletes, error: athErr } = await supabase
        .from('athletes')
        .select('id, name, email, phone')
        .in('id', athleteIds)
      if (athErr) throw athErr
      for (const a of athletes ?? []) {
        athletesById[a.id] = { name: a.name ?? null, email: a.email ?? null, phone: a.phone ?? null }
      }
    }

    // 3) memberships (todas del set de atletas → evaluamos vigencia por fecha de acceso)
    const membershipsByAthlete: Record<string, Array<any>> = {}
    if (athleteIds.length) {
      const { data: mems, error: memErr } = await supabase
        .from('memberships')
        .select('athlete_id, plan, status, start_date, end_date')
        .in('athlete_id', athleteIds)
      if (memErr) throw memErr
      for (const m of mems ?? []) {
        const k = m.athlete_id as string
        if (!membershipsByAthlete[k]) membershipsByAthlete[k] = []
        membershipsByAthlete[k].push(m)
      }
      for (const k of Object.keys(membershipsByAthlete)) {
        membershipsByAthlete[k].sort((a, b) => (a.end_date < b.end_date ? 1 : -1))
      }
    }

    const rows: AccessRow[] = logs.map((l: any) => {
      const ath = l.athlete_id ? athletesById[l.athlete_id] : undefined

      let plan_vigente: string | null = null
      let plan_inicio: string | null = null
      let plan_fin: string | null = null

      if (l.athlete_id && membershipsByAthlete[l.athlete_id]) {
        const tsDate = new Date(l.ts)
        const onlyDate = new Date(Date.UTC(tsDate.getUTCFullYear(), tsDate.getUTCMonth(), tsDate.getUTCDate()))
        const found = membershipsByAthlete[l.athlete_id].find((m: any) => {
          return (
            (m.status ?? 'active') === 'active' &&
            new Date(m.start_date) <= onlyDate &&
            onlyDate <= new Date(m.end_date)
          )
        })
        if (found) {
          plan_vigente = found.plan ?? null
          plan_inicio = found.start_date ?? null
          plan_fin = found.end_date ?? null
        }
      }

      return {
        fecha: l.ts,
        socio: ath?.name ?? null,
        email: ath?.email ?? null,
        phone: ath?.phone ?? null,
        tarjeta_uid: l.card_uid ?? null,
        estado: l.result, // <- enum real (allowed/denied/expired/unknown_card)
        plan_vigente,
        plan_inicio,
        plan_fin,
        nota: l.note ?? null,
      }
    })

    const csv = toCsv(rows)
    const fileName = `reporte_accesos_${requested || 'todos'}${from ? `_${from}` : ''}${to ? `_${to}` : ''}.csv`
    return new Response(`\uFEFF${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err: any) {
    const msg = err?.message ?? String(err)
    return new Response(`error,detalle\ntrue,"${msg.replace(/"/g, '""')}"`, {
      status: 500,
      headers: { 'Content-Type': 'text/csv; charset=utf-8' },
    })
  }
}

export const GET = withApiLogging(handleGet, {
  successMessage: ({ response }) =>
    response.ok
      ? 'Access report generated successfully'
      : `Access report returned status ${response.status}`,
  errorMessage: ({ error }) =>
    error instanceof Error
      ? `Failed to generate access report: ${error.message}`
      : `Failed to generate access report: ${String(error)}`,
})
