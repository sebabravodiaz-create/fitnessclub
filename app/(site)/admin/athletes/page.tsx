'use client'

export const dynamic = 'force-dynamic'

import AthletesClient from './table-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AthletesPage() {
  const router = useRouter()

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={() => router.back()}
          className="text-sm underline"
        >
          ← Volver
        </button>

        <h1 className="text-2xl font-bold flex-1 text-center">Atletas</h1>

        <Link
          href="/admin/athletes/new"
          className="inline-flex items-center justify-center rounded-lg bg-black text-white px-4 py-2 hover:bg-black/80"
        >
          Nuevo deportista
        </Link>
      </div>

      <div className="mt-4">
        <AthletesClient />
      </div>
    </main>
  )
}
