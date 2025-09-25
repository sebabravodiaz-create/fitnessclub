import Link from 'next/link'

const downloadButton =
  'inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-gray-300 hover:bg-gray-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black'

function DownloadLink({ href, label, description }: { href: string; label: string; description?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <div className="font-semibold">{label}</div>
      {description && <p className="text-sm text-gray-600">{description}</p>}
      <div>
        <a href={href} className={downloadButton} download>
          Descargar CSV
        </a>
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <Link href="/admin" className="text-sm underline">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold flex-1 text-center">Reportes</h1>
        <span className="w-[60px]" aria-hidden />
      </div>

      <p className="mt-4 text-sm text-gray-600">
        Genera reportes en formato CSV para analizarlos en tu herramienta favorita. Todos los archivos se descargan con la zona
        horaria en UTC.
      </p>

      <section className="mt-6 grid gap-4">
        <h2 className="text-lg font-semibold">Control de accesos</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <DownloadLink
            href="/api/admin/reports/access?status=ok&range=30d"
            label="Accesos con tarjeta OK"
            description="Últimos 30 días con ingreso permitido."
          />
          <DownloadLink
            href="/api/admin/reports/access?status=nok&range=30d"
            label="Accesos rechazados"
            description="Últimos 30 días con tarjeta desconocida, expirada o denegada."
          />
          <DownloadLink
            href="/api/admin/reports/access?status=all&range=7d"
            label="Bitácora completa"
            description="Todos los eventos de la última semana."
          />
        </div>
      </section>

      <section className="mt-10 grid gap-4">
        <h2 className="text-lg font-semibold">Membresías</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <DownloadLink
            href="/api/admin/reports/memberships?range=90d"
            label="Actualizaciones de membresía"
            description="Altas y renovaciones registradas en los últimos 90 días."
          />
          <DownloadLink
            href="/api/admin/reports/memberships/expiring?days=14"
            label="Membresías por vencer"
            description="Socios con membresía activa que expira en los próximos 14 días."
          />
        </div>
      </section>

      <section className="mt-10 grid gap-4">
        <h2 className="text-lg font-semibold">Otras ideas</h2>
        <div className="grid gap-3">
          <p className="text-sm text-gray-600">
            ¿Necesitas otro reporte? Escríbenos qué métricas te interesan y las agregaremos aquí.
          </p>
        </div>
      </section>
    </main>
  )
}
