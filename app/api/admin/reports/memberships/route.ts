// app/api/admin/reports/memberships/route.ts
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  chileDateRange,
  formatChileDateTime,
  startOfChileDay,
  toChileDateString,
} from '@/lib/chileTime'

type Row = {
  socio: string
  plan_nuevo: string
  plan_anterior: string | null
  start_date: string
  end_date: string
  status_registro: string
  tipo_movimiento: 'Nueva' | 'Renovación' | 'Cambio de plan' | 'Otro'
  estado_actual: 'Activa' | 'Suspensión/No activa'
  created_at: string | null
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

// GET /api/admin/reports/memberships?from=YYYY-MM-DD&to=YYYY-MM-DD&date_field=created_at|start_date|end_date&limit=10000
export async function GET(req: NextRequest) {
  try {
    const supabase = getServerClient()
    const url = new URL(req.url)
    const from = url.searchParams.get('from')
    const to = url.searchParams.get('to')
    const dateField = (url.searchParams.get('date_field') ?? 'created_at') as 'created_at' | 'start_date' | 'end_date'
    const limit = Math.min(Number(url.searchParams.get('limit')) || 10000, 50000)
    const { isoFrom, isoTo } = chileDateRange(from, to)

    // Traer memberships + nombre del atleta
    let q = supabase
      .from('memberships')
      .select('id, athlete_id, plan, start_date, end_date, status, created_at, athletes(name)')
      .order('athlete_id')
      .order('start_date')
      .limit(limit)

    if (isoFrom) q = q.gte(dateField, isoFrom)
    if (isoTo) q = q.lte(dateField, isoTo)

    const { data, error } = await q
    if (error) throw error

    // Agrupar por atleta y clasificar
    const byAthlete: Record<string, any[]> = {}
    for (const m of data ?? []) {
      const k = m.athlete_id as string
      if (!byAthlete[k]) byAthlete[k] = []
      byAthlete[k].push(m)
    }

    const rows: Row[] = []
    for (const k of Object.keys(byAthlete)) {
      const list = byAthlete[k].sort((a, b) => (a.start_date < b.start_date ? -1 : 1))
      let prev: any | null = null
      for (const m of list) {
        let tipo: Row['tipo_movimiento'] = 'Otro'
        if (!prev) {
          tipo = 'Nueva'
        } else if (m.plan === prev.plan) {
          if (!prev.end_date || !m.start_date) {
            tipo = 'Cambio de plan'
          } else {
            const prevEnd = startOfChileDay(prev.end_date).getTime()
            const mStart = startOfChileDay(m.start_date).getTime()
            // contiguo (1 día)
            if (mStart === prevEnd + 24 * 60 * 60 * 1000) tipo = 'Renovación'
            else tipo = 'Cambio de plan' // mismo plan pero con lag → lo tratamos como “cambio/otro”
          }
        } else {
          tipo = 'Cambio de plan'
        }

        const estado_actual = (m.status ?? 'active') === 'active' ? 'Activa' : 'Suspensión/No activa'

        rows.push({
          socio: m.athletes?.name ?? '[sin nombre]',
          plan_nuevo: m.plan,
          plan_anterior: prev?.plan ?? null,
          start_date: m.start_date ? toChileDateString(m.start_date) : '',
          end_date: m.end_date ? toChileDateString(m.end_date) : '',
          status_registro: m.status ?? 'active',
          tipo_movimiento: tipo,
          estado_actual,
          created_at: m.created_at ? formatChileDateTime(m.created_at) : null,
        })
        prev = m
      }
    }

    // Orden más reciente arriba por created_at
    rows.sort((a, b) => {
      const ax = a.created_at ? Date.parse(a.created_at) : 0
      const bx = b.created_at ? Date.parse(b.created_at) : 0
      return bx - ax
    })

    const csv = toCsv(rows)
    const file = `reporte_membresias${from ? `_${from}` : ''}${to ? `_${to}` : ''}_${dateField}.csv`

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
