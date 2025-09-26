// app/api/admin/reports/summary/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chileDateRange, toChileDateString } from '@/lib/chileTime'
import { loadAndApplyAppSettings } from '@/lib/appSettings.server'

type AccessStatus = 'allowed' | 'denied' | 'expired' | 'unknown_card'

type SummaryRow = {
  periodo: string
  accesos_ok: number
  accesos_nok: number
  accesos_unknown_card: number
  nuevos_socios: number
  membresias_no_activas_creadas: number
}

function toCsv(rows: Array<Record<string, unknown>>) {
  if (!rows.length) return 'mensaje\nNo hay datos disponibles para el resumen solicitado.'
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

function ym(d: string | Date) {
  const date = toChileDateString(d)
  return date.slice(0, 7)
}

// GET /api/admin/reports/summary?from=YYYY-MM-DD&to=YYYY-MM-DD
export async function GET(req: NextRequest) {
  try {
    await loadAndApplyAppSettings()
    const supabase = getServerClient()
    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const { isoFrom, isoTo } = chileDateRange(from, to)

    // Access logs
    let qa = supabase.from('access_logs').select('ts, result')
    if (isoFrom) qa = qa.gte('ts', isoFrom)
    if (isoTo) qa = qa.lte('ts', isoTo)
    const { data: acc, error: accErr } = await qa
    if (accErr) throw accErr

    // Athletes
    let qb = supabase.from('athletes').select('created_at')
    if (isoFrom) qb = qb.gte('created_at', isoFrom)
    if (isoTo) qb = qb.lte('created_at', isoTo)
    const { data: ath, error: athErr } = await qb
    if (athErr) throw athErr

    // Memberships
    let qm = supabase.from('memberships').select('created_at, status')
    if (isoFrom) qm = qm.gte('created_at', isoFrom)
    if (isoTo) qm = qm.lte('created_at', isoTo)
    const { data: mem, error: memErr } = await qm
    if (memErr) throw memErr

    const byPeriod: Record<string, SummaryRow> = {}
    const ensure = (p: string) => {
      if (!byPeriod[p]) {
        byPeriod[p] = {
          periodo: p,
          accesos_ok: 0,
          accesos_nok: 0,
          accesos_unknown_card: 0,
          nuevos_socios: 0,
          membresias_no_activas_creadas: 0,
        }
      }
      return byPeriod[p]
    }

    const statusToSummaryField: Record<AccessStatus, 'accesos_ok' | 'accesos_nok' | 'accesos_unknown_card'> = {
      allowed: 'accesos_ok',
      denied: 'accesos_nok',
      expired: 'accesos_nok',
      unknown_card: 'accesos_unknown_card',
    }

    for (const a of acc ?? []) {
      const p = ym(a.ts)
      const row = ensure(p)
      const status = statusToSummaryField[(a.result ?? 'unknown_card') as AccessStatus] || 'accesos_unknown_card'
      row[status] += 1
    }

    for (const a of ath ?? []) ensure(ym(a.created_at)).nuevos_socios += 1

    for (const m of mem ?? []) {
      const row = ensure(ym(m.created_at))
      if ((m.status ?? 'active') !== 'active') row.membresias_no_activas_creadas += 1
    }

    const rows = Object.values(byPeriod).sort((a, b) => (a.periodo < b.periodo ? -1 : 1))
    const file = `reporte_resumen_mensual${from ? `_${from}` : ''}${to ? `_${to}` : ''}.csv`

    const csv = toCsv(rows)
    return new Response(`\uFEFF${csv}`, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${file}"`,
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
