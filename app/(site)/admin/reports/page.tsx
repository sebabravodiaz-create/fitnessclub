type ReportAction = {
  href: string
  label: string
  description?: string
}

type ReportCardProps = {
  title: string
  summary: string
  actions: ReportAction[]
}

function ReportCard({ title, summary, actions }: ReportCardProps) {
  return (
    <section className="rounded-2xl border bg-white p-6 shadow-sm">
      <header className="mb-4">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        <p className="mt-1 text-sm text-gray-600">{summary}</p>
      </header>
      <div className="flex flex-wrap gap-3">
        {actions.map((action) => (
          <a
            key={action.href + action.label}
            href={action.href}
            download
            className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:border-blue-200 hover:bg-blue-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2"
          >
            <span>{action.label}</span>
            {action.description && (
              <span className="text-xs font-normal text-blue-500">
                {action.description}
              </span>
            )}
          </a>
        ))}
      </div>
    </section>
  )
}

const reportGroups: ReportCardProps[] = [
  {
    title: 'Accesos por tarjeta',
    summary:
      'Descarga los registros históricos de accesos con validación OK o NOK para revisar actividades inusuales.',
    actions: [
      {
        href: '/api/admin/reports/access?status=ok',
        label: 'Descargar accesos OK',
        description: 'CSV',
      },
      {
        href: '/api/admin/reports/access?status=nok',
        label: 'Descargar accesos NOK',
        description: 'CSV',
      },
    ],
  },
  {
    title: 'Actualizaciones de membresía',
    summary:
      'Listado de renovaciones, degradaciones y suspensiones para conciliar con facturación y área comercial.',
    actions: [
      {
        href: '/api/admin/reports/memberships',
        label: 'Descargar movimientos de membresía',
        description: 'CSV',
      },
    ],
  },
]

export default function ReportsPage() {
  return (
    <main className="space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="mx-auto mt-2 max-w-3xl text-sm text-gray-600">
          Explora opciones preliminares de reportes para el panel administrativo. Puedes descargar los archivos CSV con datos
          ficticios a modo de ejemplo y utilizarlos como base para futuras integraciones con la base de datos.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-2">
        {reportGroups.map((group) => (
          <ReportCard key={group.title} {...group} />
        ))}
      </div>
    </main>
  )
}

