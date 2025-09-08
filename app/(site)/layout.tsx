'use client'

import Link from 'next/link'
import Image from 'next/image'
import type { ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import SignOutButton from './SignOutButton' // seguirá existiendo, pero se mostrará solo en /admin

export default function SiteLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin') // 👈 solo en /admin

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          {/* Marca */}
          <div className="flex items-center gap-3">
            <Image
              src="/images/logo.png"   // asegúrate que exista en public/images/logo.png
              alt="Grulla Club Grulla Blanca"
              width={36}
              height={36}
              className="rounded"
            />
            <span className="font-medium">Fitness Club Grulla Blanca</span>
          </div>

          {/* Nav */}
          <nav className="flex items-center gap-2">
            <Link href="/#clases"   className="px-3 py-2 rounded-full hover:bg-gray-100">Clases</Link>
            <Link href="/#galeria"  className="px-3 py-2 rounded-full hover:bg-gray-100">Galería</Link>
            <Link href="/#contacto" className="px-3 py-2 rounded-full hover:bg-gray-100">Contacto</Link>
            <Link href="/rutinas"   className="px-3 py-2 rounded-full border">Rutinas</Link>
            <Link href="/admin"     className="px-3 py-2 rounded-full bg-black text-white">Admin</Link>
          </nav>
          {/* Botón Salir: solo en /admin */}
          <div className="flex items-center">
            {isAdmin && <SignOutButton />}
          </div>
        </div>
      </header>

      {/* Contenido */}
      <main>{children}</main>
    </div>
  )
}
