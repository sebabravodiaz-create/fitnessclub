import { NextResponse } from 'next/server'
import { getServiceRoleClient, getServiceRoleConfig } from '@/lib/supabase/service-role'
import { toCSV } from '@/lib/csv'

const STATUS_MAP = {
  ok: ['allowed'] as const,
  nok: ['denied', 'expired', 'unknown_card'] as const,
  all: ['allowed', 'denied', 'expired', 'unknown_card'] as const,
}

type AccessResult = (typeof STATUS_MAP)['all'][number]

const RESULT_LABEL: Record<AccessResult, string> = {
  allowed: 'OK',
  denied: 'DENEGADO',
  expired: 'MEMBRESIA_EXPIRADA',
  unknown_card: 'TARJETA_DESCONOCIDA',
}

function parseRange(range: string | null, defaultDays: number): number | null {
  if (!range) return defaultDays
  if (range.toLowerCase() === 'all') return null
  const match = range.match(/^(\d+)d$/i)
  if (!match) return defaultDays
  return Number.parseInt(match[1], 10)
}

function formatDateInput(days: number | null): string | null {
  if (days === null) return null
  const now = new Date()
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return from.toISOString()
}

type AccessLogRow = {
  ts: string | null
  result: AccessResult
  card_uid: string | null
  note: string | null
  athlete: { id: string; name: string | null } | null
}

export async function GET(req: Request) {
  const config = getServiceRoleConfig()
  if (!config) {
    return NextResponse.json(
      {
        ok: false,
        error: 'missing_supabase_service_role',
      },
      { status: 503 },
    )
  }

  const supabase = getServiceRoleClient(config)
  const url = new URL(req.url)
  const statusParam = (url.searchParams.get('status') || 'all').toLowerCase() as keyof typeof STATUS_MAP
  const statuses = STATUS_MAP[statusParam] || STATUS_MAP.all
  const rangeDays = parseRange(url.searchParams.get('range'), statusParam === 'all' ? 7 : 30)
  const from = formatDateInput(rangeDays)

  let query = supabase
    .from('access_logs')
    .select(`
      ts,
      result,
      card_uid,
      note,
      athlete:athletes ( id, name )
    `)
    .in('result', statuses)
    .order('ts', { ascending: false })

  if (from) {
    query = query.gte('ts', from)
  }

  const { data, error } = await query.limit(5000)

  if (error) {
    console.error('Error generating access report', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const rows: string[][] = [[
    'timestamp_utc',
    'estado',
    'resultado_original',
    'card_uid',
    'athlete_id',
    'athlete_nombre',
    'nota',
  ]]

  for (const row of (data as AccessLogRow[]) || []) {
    rows.push([
      row.ts ? new Date(row.ts).toISOString() : '',
      RESULT_LABEL[row.result],
      row.result,
      row.card_uid ?? '',
      row.athlete?.id ?? '',
      row.athlete?.name ?? '',
      row.note ?? '',
    ])
  }

  const csv = toCSV(rows)
  const today = new Date().toISOString().slice(0, 10)
  const filename = `reporte-accesos-${statusParam}-${today}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
