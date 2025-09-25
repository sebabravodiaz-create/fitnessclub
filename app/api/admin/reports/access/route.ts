import type { NextRequest } from 'next/server'

type AccessStatus = 'ok' | 'nok'

const dataByStatus: Record<AccessStatus, Array<Record<string, string>>> = {
  ok: [
    {
      fecha: '2024-06-01T06:05:11Z',
      socio: 'María González',
      membresia: 'Full Access',
      tarjeta: 'A1B2C3',
      estado: 'OK',
    },
    {
      fecha: '2024-06-01T07:12:43Z',
      socio: 'Juan Pérez',
      membresia: 'Morning Club',
      tarjeta: 'D4E5F6',
      estado: 'OK',
    },
    {
      fecha: '2024-06-01T08:55:09Z',
      socio: 'Camila Rojas',
      membresia: 'Weekend Pass',
      tarjeta: 'G7H8I9',
      estado: 'OK',
    },
  ],
  nok: [
    {
      fecha: '2024-06-01T06:45:02Z',
      socio: 'Luis Muñoz',
      membresia: 'Full Access',
      tarjeta: 'J1K2L3',
      estado: 'NOK',
    },
    {
      fecha: '2024-06-01T09:31:27Z',
      socio: 'Daniela Silva',
      membresia: 'Corporate',
      tarjeta: 'M4N5O6',
      estado: 'NOK',
    },
  ],
}

function toCsv(rows: Array<Record<string, string>>) {
  if (rows.length === 0) {
    return 'mensaje\nNo se encontraron registros para los filtros seleccionados.'
  }

  const header = Object.keys(rows[0])
  const csvRows = rows.map((row) => header.map((key) => row[key] ?? '').join(','))

  return [header.join(','), ...csvRows].join('\n')
}

export async function GET(request: NextRequest) {
  const statusParam = request.nextUrl.searchParams.get('status') ?? 'ok'
  const status = statusParam === 'nok' ? 'nok' : 'ok'

  const csv = toCsv(dataByStatus[status])
  const fileName = `reporte_accesos_${status}.csv`

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Cache-Control': 'no-store',
    },
  })
}

