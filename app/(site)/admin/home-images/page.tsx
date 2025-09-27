'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const BUCKET = 'home-assets'
const HERO_FOLDER = 'hero'
const GALLERY_FOLDER = 'gallery'

interface StoredAsset {
  path: string
  previewUrl: string
  createdAtLabel?: string
  sizeLabel?: string
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

function formatBytes(bytes?: number | null) {
  if (!bytes) return undefined
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex += 1
  }

  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`
}

async function getPreviewUrl(path: string, width: number, height?: number) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path, {
    transform: {
      width,
      height,
      resize: 'contain',
    },
  })
  return data?.publicUrl ?? ''
}

export default function HomeImagesAdminPage() {
  const [heroAsset, setHeroAsset] = useState<StoredAsset | null>(null)
  const [galleryAssets, setGalleryAssets] = useState<StoredAsset[]>([])
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const showBucketSetupHint = useMemo(
    () => !loading && heroAsset === null && galleryAssets.length === 0,
    [loading, heroAsset, galleryAssets]
  )

  const loadAssets = async () => {
    setLoading(true)
    setMessage('Cargando recursos…')

    try {
      const heroPromise = supabase.storage
        .from(BUCKET)
        .list(HERO_FOLDER, { limit: 10, offset: 0, sortBy: { column: 'created_at', order: 'desc' } })
      const galleryPromise = supabase.storage
        .from(BUCKET)
        .list(GALLERY_FOLDER, { limit: 60, offset: 0, sortBy: { column: 'created_at', order: 'desc' } })

      const [heroResult, galleryResult] = await Promise.all([heroPromise, galleryPromise])

      if (heroResult.error && heroResult.error.message) {
        throw new Error(heroResult.error.message)
      }

      if (galleryResult.error && galleryResult.error.message) {
        throw new Error(galleryResult.error.message)
      }

      const heroEntry = heroResult.data?.find((entry) => entry.name)
      if (heroEntry?.name) {
        const path = `${HERO_FOLDER}/${heroEntry.name}`
        setHeroAsset({
          path,
          previewUrl: await getPreviewUrl(path, 1600, 900),
          createdAtLabel: formatDate(heroEntry.created_at ?? heroEntry.updated_at ?? undefined),
          sizeLabel: formatBytes((heroEntry.metadata as { size?: number } | null)?.size ?? undefined),
        })
      } else {
        setHeroAsset(null)
      }

      const galleryMapped: StoredAsset[] = []
      for (const entry of galleryResult.data ?? []) {
        if (!entry.name) continue
        const path = `${GALLERY_FOLDER}/${entry.name}`
        galleryMapped.push({
          path,
          previewUrl: await getPreviewUrl(path, 800, 800),
          createdAtLabel: formatDate(entry.created_at ?? entry.updated_at ?? undefined),
          sizeLabel: formatBytes((entry.metadata as { size?: number } | null)?.size ?? undefined),
        })
      }
      setGalleryAssets(galleryMapped)
      setMessage(`Se cargaron ${galleryMapped.length + (heroEntry ? 1 : 0)} recursos ✔️`)
    } catch (error) {
      console.error(error)
      setHeroAsset(null)
      setGalleryAssets([])
      const reason = error instanceof Error ? error.message : 'Error desconocido'
      setMessage(`No fue posible cargar el bucket home-assets: ${reason}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAssets()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleHeroUpload = async (file: File) => {
    setLoading(true)
    setMessage('Subiendo imagen del hero…')

    try {
      const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : ''
      const path = `${HERO_FOLDER}/hero-${Date.now()}${extension}`
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type })

      if (error) throw error

      if (heroAsset?.path && heroAsset.path !== path) {
        await supabase.storage.from(BUCKET).remove([heroAsset.path])
      }

      setMessage('Hero actualizado correctamente ✔️')
      await loadAssets()
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Error desconocido'
      setMessage(`No se pudo subir la imagen del hero: ${reason}`)
    } finally {
      setLoading(false)
    }
  }

  const handleGalleryUpload = async (files: FileList) => {
    if (!files.length) return

    setLoading(true)
    setMessage('Subiendo imágenes de la galería…')

    try {
      for (const file of Array.from(files)) {
        const sanitizedName = file.name.replace(/\s+/g, '-').toLowerCase()
        const path = `${GALLERY_FOLDER}/${Date.now()}-${sanitizedName}`
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type })
        if (error) throw error
      }

      setMessage('Galería actualizada ✔️')
      await loadAssets()
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Error desconocido'
      setMessage(`No se pudieron subir las imágenes: ${reason}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (path: string) => {
    setLoading(true)
    setMessage('Eliminando recurso…')

    try {
      const { error } = await supabase.storage.from(BUCKET).remove([path])
      if (error) throw error
      setMessage('Recurso eliminado ✔️')
      await loadAssets()
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Error desconocido'
      setMessage(`No se pudo eliminar el recurso: ${reason}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="space-y-8">
      <header className="space-y-2 text-center">
        <h1 className="text-3xl font-bold text-gray-900">Imágenes del Home</h1>
        <p className="text-sm text-gray-600">
          Administra los recursos públicos del hero y la galería guardados en el bucket <code>{BUCKET}</code>.
        </p>
        <p className="text-xs text-gray-500">{loading ? 'Procesando…' : message}</p>
      </header>

      {showBucketSetupHint && (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-12 text-center text-sm text-gray-500">
          Prepara el bucket público <code>{BUCKET}</code> con las carpetas <code>{HERO_FOLDER}</code> y <code>{GALLERY_FOLDER}</code> para comenzar.
        </div>
      )}

      <section className="grid gap-8 lg:grid-cols-2">
        <article className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <header>
            <h2 className="text-xl font-semibold text-gray-900">Hero principal</h2>
            <p className="text-sm text-gray-600">Imagen destacada que aparece en la portada.</p>
          </header>

          <label className="block cursor-pointer rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600 hover:border-gray-400">
            <span className="font-medium text-gray-700">Subir nueva imagen</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void handleHeroUpload(file)
              }}
            />
          </label>

          {heroAsset ? (
            <div className="overflow-hidden rounded-xl border">
              <div className="flex aspect-video items-center justify-center bg-gray-100">
                {heroAsset.previewUrl ? (
                  <img src={heroAsset.previewUrl} alt="Hero actual" className="h-full w-full object-cover" loading="lazy" />
                ) : (
                  <span className="text-xs text-gray-500">Sin vista previa</span>
                )}
              </div>
              <div className="space-y-1 p-4 text-sm">
                <p className="font-medium text-gray-900">{heroAsset.path}</p>
                {heroAsset.createdAtLabel && <p className="text-xs text-gray-500">Actualizado el {heroAsset.createdAtLabel}</p>}
                {heroAsset.sizeLabel && <p className="text-xs text-gray-500">Peso: {heroAsset.sizeLabel}</p>}
                <div className="flex flex-wrap gap-3 pt-2">
                  {heroAsset.previewUrl && (
                    <a
                      href={heroAsset.previewUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-blue-600 hover:underline"
                    >
                      Abrir original
                    </a>
                  )}
                  <button
                    type="button"
                    className="text-xs font-semibold text-red-600 hover:underline"
                    onClick={() => void handleDelete(heroAsset.path)}
                    disabled={loading}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aún no hay una imagen para el hero.</p>
          )}
        </article>

        <article className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900">Galería</h2>
            <p className="text-sm text-gray-600">Miniaturas mostradas en la sección de Instagram.</p>
          </header>

          <label className="block cursor-pointer rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600 hover:border-gray-400">
            <span className="font-medium text-gray-700">Subir imágenes</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(event) => {
                const files = event.target.files
                event.target.value = ''
                if (files) void handleGalleryUpload(files)
              }}
            />
          </label>

          {galleryAssets.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {galleryAssets.map((asset) => (
                <div key={asset.path} className="overflow-hidden rounded-xl border">
                  <div className="flex aspect-square items-center justify-center bg-gray-100">
                    {asset.previewUrl ? (
                      <img src={asset.previewUrl} alt={asset.path} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-xs text-gray-500">Sin vista previa</span>
                    )}
                  </div>
                  <div className="space-y-1 p-4 text-sm">
                    <p className="font-medium text-gray-900">{asset.path}</p>
                    {asset.createdAtLabel && <p className="text-xs text-gray-500">Subido el {asset.createdAtLabel}</p>}
                    {asset.sizeLabel && <p className="text-xs text-gray-500">Peso: {asset.sizeLabel}</p>}
                    <div className="flex flex-wrap gap-3 pt-2">
                      {asset.previewUrl && (
                        <a
                          href={asset.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs font-semibold text-blue-600 hover:underline"
                        >
                          Abrir original
                        </a>
                      )}
                      <button
                        type="button"
                        className="text-xs font-semibold text-red-600 hover:underline"
                        onClick={() => void handleDelete(asset.path)}
                        disabled={loading}
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Aún no hay imágenes en la galería.</p>
          )}
        </article>
      </section>
    </main>
  )
}
