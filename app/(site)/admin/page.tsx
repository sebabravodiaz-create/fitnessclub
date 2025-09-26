import Link from 'next/link'
import type { Route } from 'next'

function Tile({
  href,
  title,
  subtitle,
}: {
  href: Route
  title: string
  subtitle?: string
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border bg-white p-6 shadow hover:shadow-md transition focus:outline-none focus:ring-2 focus:ring-offset-2"
    >
      <div className="text-xl font-semibold">{title}</div>
      {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
    </Link>
  )
}

export default function AdminHome() {
  return (
    <main>
      {/* título centrado */}
      <h1 className="text-3xl font-bold mb-6 text-center">
        Panel de Administración
      </h1>

      {/* las tarjetas ahora ocupan todo el ancho del contenedor del layout */}
      <div className="flex flex-col gap-4">
        <Tile
          href="/admin/athletes"
          title="Atletas"
          subtitle="Crear, editar, asignar tarjetas"
        />
        <Tile
          href="/kiosk"
          title="Control de acceso"
          subtitle="Página para validar RFID"
        />
        <Tile
          href="/admin/routines"
          title="Rutinas"
          subtitle="Subir y administrar PDFs públicos"
        />
        <Tile
          href="/admin/reports"
          title="Reportes"
          subtitle="Descarga de accesos, membresías y más"
        />
        <Tile
          href="/admin/settings"
          title="Configuración"
          subtitle="Ajusta horarios y preferencias generales"
        />
      </div>
    </main>
  )
}
