'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'

type ReportConfig = {
  id: string
  title: string
  description: string
  endpoint: string
  format?: string
}

const REPORTS: ReportConfig[] = [
  {
    id: 'access-ok',
    title: 'Accesos con tarjeta (OK)',
    description: 'Listado de ingresos válidos registrados por el tótem o kiosko de acceso.',
    endpoint: '/reports/access?status=ok',
    format: 'csv',
  },
  {
    id: 'access-nok',
    title: 'Accesos con tarjeta (NOK)',
    description:
      'Intentos fallidos de acceso con tarjeta para detectar incidencias o tarjetas sin permiso.',
    endpoint: '/reports/access?status=nok',
    format: 'csv',
  },
  {
    id: 'memberships-updates',
    title: 'Actualizaciones de membresía',
    description: 'Cambios recientes en planes, renovaciones y caducidades de membresías.',
    endpoint: '/reports/memberships/updates',
    format: 'xlsx',
  },
  {
    id: 'daily-summary',
    title: 'Resumen diario del club',
    description:
      'Compilado con accesos, altas/bajas de miembros y notas operativas para la jornada seleccionada.',
    endpoint: '/reports/daily-summary',
    format: 'pdf',
  },
]

function buildReportUrl(baseUrl: string | undefined, endpoint: string) {
  if (!baseUrl) return undefined
  const normalizedBase = baseUrl.replace(/\/$/, '')
  return `${normalizedBase}${endpoint}`
}

export default function ReportsPage() {
  const router = useRouter()
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL

  const reports = useMemo(
    () =>
      REPORTS.map((report) => ({
        ...report,
        downloadUrl: buildReportUrl(baseUrl, report.endpoint),
      })),
    [baseUrl],
  )

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <button onClick={() => router.back()} className="text-sm underline">
          ← Volver
        </button>

        <h1 className="text-2xl font-bold flex-1 text-center">Reportes</h1>

        <div className="w-24" aria-hidden />
      </div>

      <p className="mt-4 text-gray-600 text-sm">
        Selecciona un reporte para descargar los datos más recientes. Los enlaces requieren que la
        API administrativa exponga los endpoints señalados y que la variable{' '}
        <code className="px-1 py-0.5 rounded bg-gray-100">NEXT_PUBLIC_API_BASE_URL</code> esté
        configurada.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {reports.map((report) => (
          <article
            key={report.id}
            className="rounded-2xl border bg-white p-6 shadow-sm flex flex-col gap-4"
          >
            <header>
              <h2 className="text-lg font-semibold">{report.title}</h2>
              <p className="text-sm text-gray-600 mt-1">{report.description}</p>
            </header>

            <footer className="flex items-center justify-between gap-4">
              <span className="text-xs uppercase tracking-wide text-gray-500">
                Formato sugerido: {report.format?.toUpperCase() ?? 'CSV'}
              </span>

              <button
                type="button"
                onClick={() => report.downloadUrl && window.open(report.downloadUrl, '_blank')}
                className="inline-flex items-center justify-center rounded-lg bg-black text-white px-4 py-2 text-sm hover:bg-black/80 disabled:bg-gray-300 disabled:text-gray-500"
                disabled={!report.downloadUrl}
              >
                Descargar
              </button>
            </footer>
          </article>
        ))}
      </div>
    </main>
  )
}
