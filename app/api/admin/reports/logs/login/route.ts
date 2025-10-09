import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withApiLogging } from '@/lib/logger'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type LoginLogRow = {
  fecha: string
  email: string | null
  usuario_id: string | null
  exitoso: 'Sí' | 'No'
  motivo_fallo: string | null
  ip: string | null
  user_agent: string | null
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

// GET /api/admin/reports/logs/login?from=YYYY-MM-DD&to=YYYY-MM-DD&limit=10000
async function handleGet(req: NextRequest) {
  try {
    const supabase = getServerClient()
    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const limit = Math.min(Number(url.searchParams.get('limit')) || 10000, 50000)
    const { isoFrom, isoTo } = parseDateRange(from, to)

    let query = supabase
      .from('login_logs')
      .select('id, created_at, email, success, failure_reason, ip_address, user_agent, user_id')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (isoFrom) query = query.gte('created_at', isoFrom)
    if (isoTo) query = query.lte('created_at', isoTo)

    const { data, error } = await query
    if (error) throw error

    if (!data?.length) {
      const csv = toCsv([])
      const file = `log_acceso${from ? `_${from}` : ''}${to ? `_${to}` : ''}.csv`
      return new Response(`\uFEFF${csv}`, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${file}"`,
          'Cache-Control': 'no-store',
        },
      })
    }

    const rows: LoginLogRow[] = data.map((log) => ({
      fecha: log.created_at,
      email: log.email ?? null,
      usuario_id: log.user_id ?? null,
      exitoso: log.success ? 'Sí' : 'No',
      motivo_fallo: log.success ? null : log.failure_reason ?? null,
      ip: log.ip_address ?? null,
      user_agent: log.user_agent ?? null,
    }))

    const csv = toCsv(rows)
    const file = `log_acceso${from ? `_${from}` : ''}${to ? `_${to}` : ''}.csv`
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

export const GET = withApiLogging(handleGet, {
  successMessage: ({ response }) =>
    response.ok
      ? 'Login log report generated successfully'
      : `Login log report returned status ${response.status}`,
  errorMessage: ({ error }) =>
    error instanceof Error
      ? `Failed to generate login log report: ${error.message}`
      : `Failed to generate login log report: ${String(error)}`,
})
