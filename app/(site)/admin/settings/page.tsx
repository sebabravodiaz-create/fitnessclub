'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'

import { formatChileDateTime } from '@/lib/chileTime'
import { setChileTimeOverride } from '@/lib/timeSettings'

type SettingsResponse = {
  ok: boolean
  settings?: {
    timezoneOffsetMinutes: number | null
    updatedAt: string | null
  }
  error?: string
}

type OffsetOption = {
  label: string
  description: string
  value: number | null
}

const OPTIONS: OffsetOption[] = [
  {
    label: 'Automático (America/Santiago)',
    description:
      'Usa las reglas oficiales de zona horaria. Útil si deseas delegar los cambios de horario de verano/invierno.',
    value: null,
  },
  {
    label: 'Horario de verano (UTC-3)',
    description: 'Chile continental entre septiembre y abril. Equivalente a UTC-03:00.',
    value: -180,
  },
  {
    label: 'Horario de invierno (UTC-4)',
    description: 'Chile continental entre abril y septiembre. Equivalente a UTC-04:00.',
    value: -240,
  },
]

function valueToInput(v: number | null) {
  return v === null ? 'null' : String(v)
}

function parseInputValue(v: string): number | null {
  if (v === 'null') return null
  const num = Number(v)
  return Number.isFinite(num) ? Math.trunc(num) : null
}

function formatOffsetLabel(value: number | null) {
  if (value === null) return 'Automático'
  const absolute = Math.abs(value)
  const sign = value <= 0 ? '-' : '+'
  const hours = String(Math.floor(absolute / 60)).padStart(2, '0')
  const minutes = String(absolute % 60).padStart(2, '0')
  return `UTC${sign}${hours}:${minutes}`
}

export default function AdminSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [offset, setOffset] = useState<number | null>(null)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/admin/settings', { cache: 'no-store' })
        const data: SettingsResponse = await res.json()
        if (!data.ok || !data.settings) {
          throw new Error(data.error || 'No se pudieron obtener las configuraciones')
        }
        setOffset(data.settings.timezoneOffsetMinutes)
        setUpdatedAt(data.settings.updatedAt)
        setChileTimeOverride(data.settings.timezoneOffsetMinutes)
      } catch (err: any) {
        console.error('No se pudo cargar la configuración', err)
        setError(err?.message || 'No se pudo cargar la configuración')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const preview = useMemo(() => formatOffsetLabel(offset), [offset])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezoneOffsetMinutes: offset }),
      })
      const data: SettingsResponse = await res.json()
      if (!data.ok || !data.settings) {
        throw new Error(data.error || 'No se pudieron guardar los cambios')
      }
      setOffset(data.settings.timezoneOffsetMinutes)
      setUpdatedAt(data.settings.updatedAt)
      setChileTimeOverride(data.settings.timezoneOffsetMinutes)
      setMessage('Configuración guardada correctamente.')
    } catch (err: any) {
      console.error('No se pudo guardar la configuración', err)
      setError(err?.message || 'No se pudo guardar la configuración')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <Link href="/admin" className="text-sm underline">
        ← Volver al panel
      </Link>
      <h1 className="text-2xl font-bold">Configuración general</h1>

      <section className="border rounded-xl bg-white p-6 space-y-4">
        <header className="space-y-1">
          <h2 className="text-xl font-semibold">Zona horaria de Chile</h2>
          <p className="text-sm text-gray-600">
            Ajusta el desfase utilizado para reportes, validaciones de acceso y horarios mostrados en la plataforma.
            Recuerda actualizar este valor cuando el país cambie entre horario de verano e invierno.
          </p>
        </header>

        {loading ? (
          <p className="text-sm">Cargando configuración…</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">Selecciona el desfase actual</legend>
              {OPTIONS.map((opt) => {
                const id = `offset-${valueToInput(opt.value)}`
                return (
                  <label key={id} htmlFor={id} className="flex gap-3 rounded-lg border p-3 hover:border-gray-400 transition">
                    <input
                      id={id}
                      type="radio"
                      name="timezone-offset"
                      value={valueToInput(opt.value)}
                      checked={valueToInput(offset) === valueToInput(opt.value)}
                      onChange={(event) => setOffset(parseInputValue(event.target.value))}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{opt.label}</div>
                      <p className="text-sm text-gray-600">{opt.description}</p>
                    </div>
                  </label>
                )
              })}
            </fieldset>

            <div className="rounded-lg bg-gray-50 p-3 text-sm">
              Desfase activo: <span className="font-semibold">{preview}</span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 rounded-xl border shadow bg-white disabled:opacity-60"
              >
                {saving ? 'Guardando…' : 'Guardar cambios'}
              </button>
              {message && <span className="text-sm text-green-700">{message}</span>}
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>

            {updatedAt && (
              <p className="text-xs text-gray-500">
                Última actualización:{' '}
                {formatChileDateTime(updatedAt, {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  )
}
