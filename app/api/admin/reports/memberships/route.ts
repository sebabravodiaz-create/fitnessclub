import { NextResponse } from 'next/server'
import { getServiceRoleClient, getServiceRoleConfig } from '@/lib/supabase/service-role'
import { toCSV } from '@/lib/csv'

function parseRange(range: string | null, defaultDays: number): number | null {
  if (!range) return defaultDays
  if (range.toLowerCase() === 'all') return null
  const match = range.match(/^(\d+)d$/i)
  if (!match) return defaultDays
  return Number.parseInt(match[1], 10)
}

function computeFrom(days: number | null): string | null {
  if (days === null) return null
  const now = new Date()
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
  return from.toISOString()
}

type MembershipRow = {
  created_at: string | null
  plan: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  athlete: { id: string; name: string | null; email: string | null; phone: string | null } | null
}

const STATUS_LABEL: Record<string, string> = {
  active: 'ACTIVA',
  activo: 'ACTIVA',
  cancelled: 'CANCELADA',
  cancelada: 'CANCELADA',
  paused: 'PAUSADA',
}

function normalizeStatus(value: string | null | undefined): string {
  if (!value) return 'DESCONOCIDO'
  const key = value.toLowerCase()
  return STATUS_LABEL[key] ?? value.toUpperCase()
}

export async function GET(req: Request) {
  const config = getServiceRoleConfig()
  if (!config) {
    return NextResponse.json({ ok: false, error: 'missing_supabase_service_role' }, { status: 503 })
  }

  const supabase = getServiceRoleClient(config)
  const url = new URL(req.url)
  const rangeDays = parseRange(url.searchParams.get('range'), 90)
  const from = computeFrom(rangeDays)

  let query = supabase
    .from('memberships')
    .select(`
      created_at,
      plan,
      start_date,
      end_date,
      status,
      athlete:athletes ( id, name, email, phone )
    `)
    .order('created_at', { ascending: false })

  if (from) {
    query = query.gte('created_at', from)
  }

  const { data, error } = await query.limit(5000)

  if (error) {
    console.error('Error generating memberships report', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const rows: string[][] = [[
    'creado_utc',
    'athlete_id',
    'athlete_nombre',
    'athlete_email',
    'athlete_telefono',
    'plan',
    'inicio',
    'fin',
    'estado',
  ]]

  for (const row of (data as MembershipRow[]) || []) {
    rows.push([
      row.created_at ? new Date(row.created_at).toISOString() : '',
      row.athlete?.id ?? '',
      row.athlete?.name ?? '',
      row.athlete?.email ?? '',
      row.athlete?.phone ?? '',
      row.plan ?? '',
      row.start_date ?? '',
      row.end_date ?? '',
      normalizeStatus(row.status),
    ])
  }

  const csv = toCSV(rows)
  const today = new Date().toISOString().slice(0, 10)
  const filename = `reporte-membresias-${today}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
