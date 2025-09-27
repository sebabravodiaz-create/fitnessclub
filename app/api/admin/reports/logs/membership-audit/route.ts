import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AuditRow = {
  fecha: string
  accion: string
  socio: string | null
  atleta_id: string | null
  membership_id: string | null
  plan: string | null
  periodo: string | null
  estado_membresia: string | null
  realizado_por: string | null
  cambios: string | null
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

// GET /api/admin/reports/logs/membership-audit?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10000
export async function GET(req: NextRequest) {
  try {
    const supabase = getServerClient()
    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const limit = Math.min(Number(url.searchParams.get('limit')) || 10000, 50000)
    const { isoFrom, isoTo } = parseDateRange(from, to)

    let query = supabase
      .from('membership_audit_logs')
      .select('id, membership_id, athlete_id, action, performed_by, changes, created_at')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (isoFrom) query = query.gte('created_at', isoFrom)
    if (isoTo) query = query.lte('created_at', isoTo)

    const { data, error } = await query
    if (error) throw error

    if (!data?.length) {
      const csv = toCsv([])
      const file = `log_auditoria${from ? `_${from}` : ''}${to ? `_${to}` : ''}.csv`
      return new Response(`\uFEFF${csv}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${file}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const membershipIds = Array.from(new Set(data.map((row) => row.membership_id).filter(Boolean))) as string[]
    const athleteIds = Array.from(new Set(data.map((row) => row.athlete_id).filter(Boolean))) as string[]

    const membershipsById: Record<string, { plan: string | null; start_date: string | null; end_date: string | null; status: string | null }> = {}
    if (membershipIds.length) {
      const { data: memberships, error: membershipsError } = await supabase
        .from('memberships')
        .select('id, plan, start_date, end_date, status')
        .in('id', membershipIds)
      if (membershipsError) throw membershipsError
      for (const membership of memberships ?? []) {
        membershipsById[membership.id as string] = {
          plan: membership.plan ?? null,
          start_date: membership.start_date ?? null,
          end_date: membership.end_date ?? null,
          status: membership.status ?? null,
        }
      }
    }

    const athletesById: Record<string, string | null> = {}
    if (athleteIds.length) {
      const { data: athletes, error: athletesError } = await supabase
        .from('athletes')
        .select('id, name')
        .in('id', athleteIds)
      if (athletesError) throw athletesError
      for (const athlete of athletes ?? []) {
        athletesById[athlete.id as string] = athlete.name ?? null
      }
    }

    const rows: AuditRow[] = data.map((log) => {
      const membership = log.membership_id ? membershipsById[log.membership_id] : undefined
      const periodo = membership?.start_date && membership?.end_date
        ? `${membership.start_date} → ${membership.end_date}`
        : null

      return {
        fecha: log.created_at,
        accion: log.action,
        socio: log.athlete_id ? athletesById[log.athlete_id] ?? null : null,
        atleta_id: log.athlete_id ?? null,
        membership_id: log.membership_id ?? null,
        plan: membership?.plan ?? null,
        periodo,
        estado_membresia: membership?.status ?? null,
        realizado_por: log.performed_by ?? null,
        cambios: log.changes ? JSON.stringify(log.changes) : null,
      }
    })

    const csv = toCsv(rows)
    const file = `log_auditoria${from ? `_${from}` : ''}${to ? `_${to}` : ''}.csv`
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
