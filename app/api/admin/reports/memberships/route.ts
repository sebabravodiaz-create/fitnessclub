const membershipEvents = [
  {
    fecha: '2024-05-28',
    socio: 'María González',
    movimiento: 'Renovación',
    plan_anterior: 'Full Access',
    plan_nuevo: 'Full Access',
    ejecutado_por: 'Backend automático',
  },
  {
    fecha: '2024-05-29',
    socio: 'Juan Pérez',
    movimiento: 'Upgrade',
    plan_anterior: 'Morning Club',
    plan_nuevo: 'Full Access',
    ejecutado_por: 'Admin - Carla',
  },
  {
    fecha: '2024-05-31',
    socio: 'Daniela Silva',
    movimiento: 'Suspensión',
    plan_anterior: 'Corporate',
    plan_nuevo: 'Corporate (Suspendida)',
    ejecutado_por: 'Admin - Rodrigo',
  },
]

function toCsv(rows: Array<Record<string, string>>) {
  if (rows.length === 0) {
    return 'mensaje\nNo se encontraron registros para el período seleccionado.'
  }

  const header = Object.keys(rows[0])
  const csvRows = rows.map((row) => header.map((key) => row[key] ?? '').join(','))

  return [header.join(','), ...csvRows].join('\n')
}

export async function GET() {
  const csv = toCsv(membershipEvents)
  const csvWithBom = `﻿${csv}`

  return new Response(csvWithBom, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="reporte_membresias.csv"',
      'Cache-Control': 'no-store',
    },
  })
}

