'use client'

import { useState } from 'react'
import Link from 'next/link'

const PLACEHOLDER_PHOTO = '/images/athlete-placeholder.svg'

function formatDate(dateStr?: string | null) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  } catch (err) {
    return dateStr
  }
}

function formatDateTime(dateStr?: string | null) {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch (err) {
    return dateStr
  }
}

type ValidationResult = {
  ok?: boolean
  result?: 'allowed' | 'expired' | 'unknown_card' | 'denied'
  uid?: string
  raw_uid?: string
  note?: string | null
  ts?: string
  athlete?: {
    id?: string | null
    name?: string | null
    email?: string | null
    phone?: string | null
    photo_url?: string | null
  } | null
  membership?: {
    plan?: string | null
    status?: string | null
    start_date?: string | null
    end_date?: string | null
  } | null
  memberships?: {
    plan?: string | null
    status?: string | null
    start_date?: string | null
    end_date?: string | null
  }[]
  error?: string
}

const STATUS_STYLES: Record<string, { label: string; bg: string; text: string; ring: string }> = {
  allowed: {
    label: 'Acceso permitido',
    bg: 'bg-emerald-50',
    text: 'text-emerald-700',
    ring: 'ring-emerald-200',
  },
  expired: {
    label: 'Membresía expirada',
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    ring: 'ring-amber-200',
  },
  denied: {
    label: 'Acceso denegado',
    bg: 'bg-red-50',
    text: 'text-red-700',
    ring: 'ring-red-200',
  },
  unknown_card: {
    label: 'Tarjeta desconocida',
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    ring: 'ring-slate-200',
  },
}

export default function ManualKioskPage() {
  const [cardNumber, setCardNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [lastRawSearch, setLastRawSearch] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ValidationResult | null>(null)

  const status = data?.result ? STATUS_STYLES[data.result] : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const value = cardNumber.trim()
    if (!value) {
      setError('Ingresa un número de tarjeta para validar el acceso.')
      return
    }

    setLoading(true)
    setError(null)
    setLastRawSearch(value)

    try {
      const res = await fetch('/api/access/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardUID: value }),
      })
      const json: ValidationResult = await res.json()

      if (!res.ok) {
        setError(json.error || 'No se pudo validar la tarjeta. Intenta nuevamente.')
      }
      setData(json)
    } catch (err) {
      console.error('[manual kiosk] validate error', err)
      setError('Ocurrió un error de conexión. Verifica la red e inténtalo de nuevo.')
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white py-10 px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Modo manual</p>
            <h1 className="text-3xl font-semibold text-white">Búsqueda manual de tarjeta</h1>
            <p className="text-sm text-slate-300">
              Ingresa un número de tarjeta y presiona &ldquo;Buscar&rdquo; para consultar el estado sin depender del
              lector automático.
            </p>
          </div>
          <Link
            href="/kiosk"
            className="inline-flex items-center justify-center rounded-full border border-slate-600 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-slate-400 hover:text-white"
          >
            ← Volver al lector automático
          </Link>
        </header>

        <section className="rounded-2xl bg-white/5 p-6 shadow-lg shadow-slate-950/30 backdrop-blur">
          <form className="flex flex-col gap-4 sm:flex-row" onSubmit={handleSubmit}>
            <label className="flex-1" htmlFor="cardNumber">
              <span className="mb-2 block text-sm font-semibold text-slate-200">Número de tarjeta</span>
              <input
                id="cardNumber"
                type="text"
                autoComplete="off"
                inputMode="numeric"
                value={cardNumber}
                onChange={event => setCardNumber(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-lg text-white shadow-inner placeholder:text-slate-500 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
                placeholder="Ej. 000123456"
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="mt-6 inline-flex items-center justify-center rounded-xl bg-sky-500 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-sky-500/30 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/60 disabled:cursor-not-allowed disabled:opacity-60 sm:mt-auto"
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>
          <p className="mt-3 text-xs text-slate-400">
            La búsqueda no se actualiza automáticamente. Vuelve a presionar &ldquo;Buscar&rdquo; para consultar otro
            número.
          </p>
        </section>

        {error && (
          <div className="rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        {data && (
          <section className="grid gap-6 lg:grid-cols-[320px,1fr]">
            <div className="flex flex-col gap-4 rounded-2xl bg-white/5 p-6 shadow-lg shadow-slate-950/30">
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="relative">
                  <span className="absolute -left-2 -top-2 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-200">
                    Resultado
                  </span>
                  <div
                    className={`mt-4 flex flex-col items-center gap-3 rounded-2xl p-6 text-center shadow-inner ring-1 ${
                      status ? `${status.bg} ${status.text} ${status.ring}` : 'bg-slate-800 text-slate-200 ring-slate-700'
                    }`}
                  >
                    <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">
                      {data.ok ? 'OK' : 'Revisión'}
                    </p>
                    <p className="text-xl font-semibold">
                      {status ? status.label : 'Sin resultado disponible'}
                    </p>
                    <p className="text-xs text-slate-500">
                      Registro creado: {formatDateTime(data.ts)}
                    </p>
                  </div>
                </div>
                <img
                  src={data?.athlete?.photo_url || PLACEHOLDER_PHOTO}
                  alt={data?.athlete?.name || 'Foto del atleta'}
                  className="h-40 w-40 rounded-full border-4 border-slate-900 object-cover shadow-lg"
                />
                <div className="space-y-1">
                  <p className="text-lg font-semibold text-white">
                    {data?.athlete?.name || 'Sin nombre registrado'}
                  </p>
                  {data?.athlete?.email && <p className="text-sm text-slate-300">{data.athlete.email}</p>}
                  {data?.athlete?.phone && <p className="text-sm text-slate-300">Tel: {data.athlete.phone}</p>}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl bg-white p-6 text-slate-900 shadow-xl shadow-slate-950/20">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Detalle de la consulta</h2>
                <div className="mt-3 grid gap-2 text-sm">
                  <p className="font-medium text-slate-600">
                    Tarjeta ingresada: <span className="font-semibold text-slate-900">{lastRawSearch}</span>
                  </p>
                  <p className="font-medium text-slate-600">
                    UID sin ceros iniciales: <span className="font-semibold text-slate-900">{data.uid || '—'}</span>
                  </p>
                  {data.raw_uid && data.raw_uid !== data.uid && (
                    <p className="text-xs text-slate-500">
                      El backend eliminó los ceros iniciales de &ldquo;{data.raw_uid}&rdquo; → &ldquo;{data.uid}&rdquo;.
                    </p>
                  )}
                  {data.note && <p className="text-sm text-amber-600">Nota: {data.note}</p>}
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-base font-semibold text-slate-900">Membresía vigente</h3>
                {data.membership ? (
                  <dl className="mt-2 grid gap-1 text-sm text-slate-700">
                    <div className="flex justify-between gap-3">
                      <dt className="font-medium text-slate-500">Plan</dt>
                      <dd>{data.membership.plan || 'Sin plan asignado'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="font-medium text-slate-500">Estado</dt>
                      <dd>{data.membership.status || '—'}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="font-medium text-slate-500">Inicio</dt>
                      <dd>{formatDate(data.membership.start_date)}</dd>
                    </div>
                    <div className="flex justify-between gap-3">
                      <dt className="font-medium text-slate-500">Fin</dt>
                      <dd>{formatDate(data.membership.end_date)}</dd>
                    </div>
                  </dl>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">No se encontró una membresía activa asociada a la tarjeta.</p>
                )}
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h3 className="text-base font-semibold text-slate-900">Historial de membresías del atleta</h3>
                {data.memberships && data.memberships.length > 0 ? (
                  <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2">Plan</th>
                          <th className="px-3 py-2">Estado</th>
                          <th className="px-3 py-2">Inicio</th>
                          <th className="px-3 py-2">Fin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.memberships.map((membership, index) => (
                          <tr key={`${membership.plan}-${membership.start_date}-${index}`} className="text-slate-700">
                            <td className="px-3 py-2">{membership.plan || '—'}</td>
                            <td className="px-3 py-2 capitalize">{membership.status || '—'}</td>
                            <td className="px-3 py-2">{formatDate(membership.start_date)}</td>
                            <td className="px-3 py-2">{formatDate(membership.end_date)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-slate-500">Sin registros de membresías para este atleta.</p>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
