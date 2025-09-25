const summaryRows = [
  {
    periodo: '2024-05',
    accesos_ok: '1240',
    accesos_nok: '37',
    nuevos_socios: '58',
    membresias_suspendidas: '12',
    ingresos_estimados: '14500000',
  },
  {
    periodo: '2024-04',
    accesos_ok: '1187',
    accesos_nok: '45',
    nuevos_socios: '63',
    membresias_suspendidas: '9',
    ingresos_estimados: '13850000',
  },
]

function toCsv(rows: Array<Record<string, string>>) {
  if (rows.length === 0) {
    return 'mensaje\nNo hay datos disponibles para el resumen solicitado.'
  }

  const header = Object.keys(rows[0])
  const csvRows = rows.map((row) => header.map((key) => row[key] ?? '').join(','))

  return [header.join(','), ...csvRows].join('\n')
}

export async function GET() {
  const csv = toCsv(summaryRows)

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="reporte_resumen_mensual.csv"',
      'Cache-Control': 'no-store',
    },
  })
}

