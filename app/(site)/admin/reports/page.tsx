// app/(site)/admin/reports/page.tsx
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
      'Descarga los registros históricos de accesos con validación OK, NOK o tarjetas no reconocidas.',
    actions: [
      { href: '/api/admin/reports/access?status=ok',  label: 'Descargar accesos OK',  description: 'CSV' },
      { href: '/api/admin/reports/access?status=nok', label: 'Descargar accesos NOK', description: 'CSV' },
      { href: '/api/admin/reports/access?status=unknown_card', label: 'Descargar tarjetas no registradas', description: 'CSV' },
    ],
  },
  {
    title: 'Actualizaciones de membresía',
    summary:
      'Nuevas, renovaciones, cambios de plan y suspensiones/no activas, por atleta.',
    actions: [
      { href: '/api/admin/reports/memberships', label: 'Descargar movimientos de membresía', description: 'CSV' },
    ],
  },
  {
    title: 'Logs de plataforma',
    summary:
      'Descarga los registros generados por los inicios de sesión administrativos y las acciones del auditor de membresías.',
    actions: [
      { href: '/api/admin/reports/logs/login', label: 'Descargar log_acceso', description: 'CSV' },
      { href: '/api/admin/reports/logs/membership-audit', label: 'Descargar log_auditoría', description: 'CSV' },
    ],
  },
  {
    title: 'Resumen mensual',
    summary:
      'Accesos (OK/NOK/Unknown), nuevos socios y membresías no activas creadas por período YYYY-MM.',
    actions: [
      { href: '/api/admin/reports/summary', label: 'Descargar resumen mensual', description: 'CSV' },
    ],
  },
]

export default function ReportsPage() {
  return (
    <main className="space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Reportes</h1>
        <p className="mx-auto mt-2 max-w-3xl text-sm text-gray-600">
          Genera descargas CSV en vivo desde la base de datos para análisis y conciliaciones.
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