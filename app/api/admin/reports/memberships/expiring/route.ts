import { NextResponse } from 'next/server'
import { getServiceRoleClient, getServiceRoleConfig } from '@/lib/supabase/service-role'
import { toCSV } from '@/lib/csv'

function parseDays(value: string | null, defaultValue: number): number {
  if (!value) return defaultValue
  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed) || parsed <= 0) return defaultValue
  return Math.min(parsed, 90)
}

type MembershipRow = {
  start_date: string | null
  end_date: string | null
  plan: string | null
  status: string | null
  athlete: { id: string; name: string | null; email: string | null; phone: string | null } | null
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function normalizeStatus(value: string | null | undefined): string {
  if (!value) return 'desconocido'
  return value.toLowerCase()
}

const ACTIVE_STATUSES = new Set(['active', 'activo'])

export async function GET(req: Request) {
  const config = getServiceRoleConfig()
  if (!config) {
    return NextResponse.json({ ok: false, error: 'missing_supabase_service_role' }, { status: 503 })
  }

  const supabase = getServiceRoleClient(config)
  const url = new URL(req.url)
  const days = parseDays(url.searchParams.get('days'), 14)

  const now = new Date()
  const startDate = formatDate(now)
  const endDate = formatDate(new Date(now.getTime() + days * 24 * 60 * 60 * 1000))

  const { data, error } = await supabase
    .from('memberships')
    .select(`
      start_date,
      end_date,
      plan,
      status,
      athlete:athletes ( id, name, email, phone )
    `)
    .gte('end_date', startDate)
    .lte('end_date', endDate)
    .order('end_date', { ascending: true })

  if (error) {
    console.error('Error generating expiring memberships report', error)
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const rows: string[][] = [[
    'athlete_id',
    'athlete_nombre',
    'athlete_email',
    'athlete_telefono',
    'plan',
    'inicio',
    'fin',
    'dias_para_vencer',
    'estado_original',
  ]]

  for (const row of (data as MembershipRow[]) || []) {
    if (!row.end_date) continue
    const status = normalizeStatus(row.status)
    if (!ACTIVE_STATUSES.has(status)) continue

    const end = new Date(row.end_date)
    const diff = Math.ceil((end.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))

    rows.push([
      row.athlete?.id ?? '',
      row.athlete?.name ?? '',
      row.athlete?.email ?? '',
      row.athlete?.phone ?? '',
      row.plan ?? '',
      row.start_date ?? '',
      row.end_date ?? '',
      diff.toString(),
      row.status ?? '',
    ])
  }

  const csv = toCSV(rows)
  const today = formatDate(now)
  const filename = `reporte-membresias-por-vencer-${today}.csv`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
