import Link from 'next/link'
import Image from 'next/image'

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image src="/images/logo.png" alt="Logo" width={40} height={40} className="rounded" />
          <span className="font-semibold tracking-wide">Club Grulla Blanca</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link href="#clases" className="hover:text-yellow-600">Clases</Link>
          <Link href="#galeria" className="hover:text-yellow-600">Galería</Link>
          <Link href="#contacto" className="hover:text-yellow-600">Contacto</Link>
          <Link href="/rutinas" className="px-4 py-2 rounded-full border hover:bg-black hover:text-white">Rutinas</Link>
<Link href="/login" className="px-4 py-2 rounded-full bg-black text-white hover:opacity-90">
  Admin
</Link>
        </nav>
      </div>
    </header>
  )
}