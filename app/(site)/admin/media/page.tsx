'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const BUCKET = 'media'

type MediaItem = {
  path: string
  previewUrl: string
  createdAtLabel?: string
}

function formatDate(iso?: string) {
  if (!iso) return undefined
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return undefined
  return new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default function MediaAdminPage() {
  const [items, setItems] = useState<MediaItem[]>([])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    void loadMedia()
  }, [])

  const loadMedia = async () => {
    setLoading(true)
    setStatus('Cargando archivos…')

    const { data, error } = await supabase.storage.from(BUCKET).list('', {
      limit: 200,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    })

    if (error) {
      setStatus(`Error: ${error.message}`)
      setLoading(false)
      return
    }

    const mapped: MediaItem[] = []
    for (const entry of data ?? []) {
      if (!entry.name) continue
      const path = entry.name
      const { data: publicData } = supabase.storage.from(BUCKET).getPublicUrl(path, {
        transform: {
          width: 800,
          height: 800,
          resize: 'contain',
        },
      })
      mapped.push({
        path,
        previewUrl: publicData?.publicUrl ?? '',
        createdAtLabel: formatDate(entry.created_at),
      })
    }

    setItems(mapped)
    setStatus(`Se encontraron ${mapped.length} archivos ✔️`)
    setLoading(false)
  }

  const hasItems = useMemo(() => items.length > 0, [items])

  return (
    <main className="space-y-6">
      <header className="text-center">
        <h1 className="text-3xl font-bold text-gray-900">Medios</h1>
        <p className="mt-2 text-sm text-gray-600">
          Visualiza las imágenes almacenadas en el bucket público de Supabase.
        </p>
      </header>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-600">{status}</p>
        <button
          type="button"
          onClick={() => void loadMedia()}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        >
          Recargar
        </button>
      </div>

      {hasItems ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <article key={item.path} className="overflow-hidden rounded-2xl border bg-white shadow-sm">
              <div className="flex aspect-square items-center justify-center bg-gray-100">
                {item.previewUrl ? (
                  <img
                    src={item.previewUrl}
                    alt={item.path}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs text-gray-500">Sin vista previa</span>
                )}
              </div>

              <div className="space-y-2 p-4 text-sm">
                <p className="break-words font-medium text-gray-900">{item.path}</p>
                {item.createdAtLabel && (
                  <p className="text-xs text-gray-500">Subido el {item.createdAtLabel}</p>
                )}
                {item.previewUrl && (
                  <a
                    href={item.previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Abrir original
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          {loading ? 'Cargando archivos…' : 'No se encontraron archivos en el bucket público.'}
        </div>
      )}
    </main>
  )
}
