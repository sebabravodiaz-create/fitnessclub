'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const BUCKET = 'home-assets'

type StoredFile = {
  name: string
  url: string
  created_at?: string | null
  path: string
}

type UploadStatus = string

function useHomeStorage() {
  const [heroImages, setHeroImages] = useState<StoredFile[]>([])
  const [galleryImages, setGalleryImages] = useState<StoredFile[]>([])
  const [status, setStatus] = useState<UploadStatus>('')

  const refresh = async () => {
    setStatus('Cargando archivos…')
    try {
      const bucket = supabase.storage.from(BUCKET)

      const { data: heroFiles, error: heroError } = await bucket.list('hero', {
        limit: 100,
        sortBy: { column: 'created_at', order: 'desc' },
      })
      if (heroError) throw heroError
      setHeroImages(
        (heroFiles ?? [])
          .filter((file) => Boolean(file.name))
          .map((file) => ({
            name: file.name,
            created_at: file.created_at,
            path: `hero/${file.name}`,
            url: bucket.getPublicUrl(`hero/${file.name}`).data.publicUrl,
          }))
      )

      const { data: galleryFiles, error: galleryError } = await bucket.list('gallery', {
        limit: 200,
        sortBy: { column: 'name', order: 'asc' },
      })
      if (galleryError) throw galleryError
      setGalleryImages(
        (galleryFiles ?? [])
          .filter((file) => Boolean(file.name))
          .map((file) => ({
            name: file.name,
            created_at: file.created_at,
            path: `gallery/${file.name}`,
            url: bucket.getPublicUrl(`gallery/${file.name}`).data.publicUrl,
          }))
      )

      setStatus('Listo ✔️')
    } catch (error: any) {
      console.error(error)
      setStatus(error.message || 'No se pudieron cargar los archivos')
      setHeroImages([])
      setGalleryImages([])
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return {
    heroImages,
    galleryImages,
    refresh,
    status,
    setStatus,
  }
}

function formatDate(date?: string | null) {
  if (!date) return ''
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return ''
  return parsed.toLocaleString()
}

export default function HomeImagesAdminPage() {
  const router = useRouter()
  const heroInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const { heroImages, galleryImages, refresh, status, setStatus } = useHomeStorage()
  const activeHero = heroImages[0]

  const uploading = useMemo(() => status.startsWith('Subiendo'), [status])

  const uploadHero = async () => {
    const file = heroInputRef.current?.files?.[0]
    if (!file) {
      setStatus('Selecciona una imagen para el hero')
      return
    }

    if (!file.type.startsWith('image/')) {
      setStatus('El archivo debe ser una imagen')
      return
    }

    const ext = file.name.split('.').pop() || 'jpg'
    const path = `hero/hero-${Date.now()}.${ext}`

    setStatus('Subiendo imagen de hero…')
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type,
    })

    if (error) {
      setStatus(`Error: ${error.message}`)
      return
    }

    if (heroInputRef.current) heroInputRef.current.value = ''
    setStatus('Imagen subida ✔️')
    refresh()
  }

  const uploadGallery = async () => {
    const files = galleryInputRef.current?.files
    if (!files || files.length === 0) {
      setStatus('Selecciona al menos una imagen para la galería')
      return
    }

    setStatus('Subiendo imágenes de la galería…')
    try {
      const uploads = Array.from(files).map(async (file) => {
        if (!file.type.startsWith('image/')) {
          throw new Error(`"${file.name}" no es una imagen válida`)
        }
        const normalizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')
        const path = `gallery/${Date.now()}-${normalizedName}`
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type,
        })
        if (error) throw error
      })

      await Promise.all(uploads)
      if (galleryInputRef.current) galleryInputRef.current.value = ''
      setStatus('Galería actualizada ✔️')
      refresh()
    } catch (error: any) {
      setStatus(error.message || 'Ocurrió un error al subir la galería')
    }
  }

  const removeFile = async (path: string) => {
    setStatus(`Eliminando ${path}…`)
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) {
      setStatus(`Error: ${error.message}`)
      return
    }
    setStatus('Archivo eliminado ✔️')
    refresh()
  }

  return (
    <main className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <button onClick={() => router.back()} className="text-sm underline">
          ← Volver
        </button>
        <h1 className="text-2xl font-bold flex-1 text-center">Imágenes del home</h1>
        <div className="w-[120px]" />
      </div>

      <p className="mb-6 text-sm text-gray-600">
        Las imágenes se almacenan en el bucket público "{BUCKET}" de Supabase. La última imagen subida al hero se mostrará en la landing.
      </p>

      <section className="mb-10 rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">Hero principal</h2>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <label className="block text-sm font-medium mb-2">Seleccionar imagen</label>
            <input ref={heroInputRef} type="file" accept="image/*" className="w-full rounded border px-3 py-2" />
            <button
              onClick={uploadHero}
              className="mt-3 inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
              disabled={uploading}
            >
              Subir hero
            </button>
            {activeHero && (
              <p className="mt-4 text-sm text-gray-600">
                Actualmente se usa: <span className="font-medium">{activeHero.name}</span>
              </p>
            )}
          </div>
          {activeHero && (
            <div className="flex flex-col items-center gap-2">
              <div className="relative h-40 w-64 overflow-hidden rounded-lg border">
                <img src={activeHero.url} alt={activeHero.name} className="h-full w-full object-cover" />
              </div>
              <p className="text-xs text-gray-500">Subido: {formatDate(activeHero.created_at)}</p>
              <button
                onClick={() => removeFile(activeHero.path)}
                className="text-sm text-red-600 underline"
              >
                Eliminar hero activo
              </button>
            </div>
          )}
        </div>

        {heroImages.length > 1 && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-2">Historial</h3>
            <ul className="space-y-2 text-sm">
              {heroImages.slice(1).map((file) => (
                <li key={file.path} className="flex items-center justify-between gap-4 rounded border px-3 py-2">
                  <span className="truncate">{file.name}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">{formatDate(file.created_at)}</span>
                    <button onClick={() => removeFile(file.path)} className="text-red-600 underline">
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow">
        <h2 className="text-xl font-semibold mb-4">Galería</h2>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div>
            <label className="block text-sm font-medium mb-2">Seleccionar imágenes</label>
            <input ref={galleryInputRef} type="file" accept="image/*" multiple className="w-full rounded border px-3 py-2" />
            <button
              onClick={uploadGallery}
              className="mt-3 inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
              disabled={uploading}
            >
              Subir galería
            </button>
          </div>
          <div className="grid max-h-64 grid-cols-3 gap-2 overflow-auto">
            {galleryImages.map((file) => (
              <div key={file.path} className="relative aspect-square overflow-hidden rounded border">
                <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                <button
                  onClick={() => removeFile(file.path)}
                  className="absolute right-1 top-1 rounded bg-white/80 px-2 py-1 text-xs text-red-600 shadow"
                >
                  Eliminar
                </button>
              </div>
            ))}
            {!galleryImages.length && (
              <p className="col-span-3 text-sm text-gray-500">No hay imágenes en la galería.</p>
            )}
          </div>
        </div>
      </section>

      {!!status && <p className="mt-6 text-sm text-gray-600">{status}</p>}
    </main>
  )
}
