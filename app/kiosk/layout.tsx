export const metadata = {
  title: 'Control de Acceso',
}

export default function KioskLayout({ children }: { children: React.ReactNode }) {
  // Layout minimal: sin Navbar/Footer, fondo oscuro full-screen
  return (
    <html lang="es">
      <body className="min-h-screen">{children}</body>
    </html>
  )
}
