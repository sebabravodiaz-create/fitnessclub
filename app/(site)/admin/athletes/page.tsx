'use client'

export const dynamic = 'force-dynamic'

import AthletesClient from './table-client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { runMembershipStatusRefresh } from './actions'

type BannerState =
  | { type: 'success'; message: string }
  | { type: 'error'; message: string }
  | null

export default function AthletesPage() {
  const router = useRouter()
  const [banner, setBanner] = useState<BannerState>(null)
  const [reloadSignal, setReloadSignal] = useState(0)
  const [refreshing, startRefresh] = useTransition()

  const handleRefresh = () => {
    setBanner(null)
    startRefresh(async () => {
      const response = await runMembershipStatusRefresh()
      if (!response.ok) {
        setBanner({ type: 'error', message: response.error })
        return
      }

      const { result } = response
      const summary =
        result.markedExpired || result.markedActive
          ? `Expiradas: ${result.markedExpired} · Reactivadas: ${result.markedActive}`
          : 'No hubo cambios en los planes.'

      setBanner({
        type: 'success',
        message: `Actualización ejecutada (${summary}). Corte: ${result.effectiveDate} (${result.timeZone}).`,
      })
      setReloadSignal((value) => value + 1)
    })
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <button
          onClick={() => router.back()}
          className="text-sm underline"
        >
          ← Volver
        </button>

        <h1 className="text-2xl font-bold flex-1 text-center">Atletas</h1>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center rounded-lg border border-black px-4 py-2 text-sm font-medium hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {refreshing ? 'Actualizando…' : 'Actualizar estados'}
          </button>

          <Link
            href="/admin/athletes/new"
            className="inline-flex items-center justify-center rounded-lg bg-black text-white px-4 py-2 hover:bg-black/80"
          >
            Nuevo deportista
          </Link>
        </div>
      </div>

      {banner && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            banner.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {banner.message}
        </div>
      )}

      <div className="mt-4">
        <AthletesClient reloadSignal={reloadSignal} />
      </div>
    </main>
  )
}
