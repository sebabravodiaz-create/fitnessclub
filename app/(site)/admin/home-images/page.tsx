'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

const BUCKET = 'home-assets'
const HERO_FOLDER = 'hero'
const GALLERY_FOLDER = 'gallery'
const HERO_PREFIX = 'hero-main'
const IG_INDICES = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

type GallerySlotId = `ig-${(typeof IG_INDICES)[number]}`
type SlotId = 'hero' | GallerySlotId

type SlotDefinition = {
  id: SlotId
  label: string
  description: string
  folder: string
  prefix: string
  previewWidth: number
  previewHeight?: number
}

interface StorageEntry {
  name: string
  created_at: string | null
  updated_at: string | null
  metadata?: unknown
}

interface StoredAsset {
  path: string
  previewUrl: string
  createdAtLabel?: string
  sizeLabel?: string
}

const HERO_SLOT: SlotDefinition = {
  id: 'hero',
  label: 'Hero principal',
  description: 'Imagen destacada que aparece en la portada del sitio.',
  folder: HERO_FOLDER,
  prefix: HERO_PREFIX,
  previewWidth: 1600,
  previewHeight: 900,
}

const IG_SLOTS: SlotDefinition[] = IG_INDICES.map((index) => ({
  id: `ig-${index}` as GallerySlotId,
  label: `IG #${index}`,
  description: `Miniatura ${index} de la cuadrícula de Instagram (ig-${index}).`,
  folder: GALLERY_FOLDER,
  prefix: `ig-${index}`,
  previewWidth: 800,
  previewHeight: 800,
}))

const ALL_SLOTS: SlotDefinition[] = [HERO_SLOT, ...IG_SLOTS]

type AssetMap = Record<SlotId, StoredAsset | null>

function createEmptyAssetMap(): AssetMap {
  return ALL_SLOTS.reduce<AssetMap>((acc, slot) => {
    acc[slot.id] = null
    return acc
  }, {} as AssetMap)
}

function formatDate(iso?: string | null) {
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

function matchesPrefix(name: string, prefix: string) {
  if (!name) return false
  return name === prefix || name.startsWith(`${prefix}-`) || name.startsWith(`${prefix}.`)
}

function getBestTimestamp(entry: StorageEntry) {
  const candidate = entry.updated_at ?? entry.created_at
  if (!candidate) return 0
  const timestamp = new Date(candidate).getTime()
  return Number.isNaN(timestamp) ? 0 : timestamp
}

function findLatestForPrefix(entries: StorageEntry[], prefix: string) {
  let latest: StorageEntry | null = null
  let latestTimestamp = -Infinity

  for (const entry of entries) {
    if (!entry.name || !matchesPrefix(entry.name, prefix)) continue
    const timestamp = getBestTimestamp(entry)
    if (timestamp >= latestTimestamp) {
      latest = entry
      latestTimestamp = timestamp
    }
  }

  return latest
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
  const [slotAssets, setSlotAssets] = useState<AssetMap>(() => createEmptyAssetMap())
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const hasAnyAsset = useMemo(() => Object.values(slotAssets).some(Boolean), [slotAssets])
  const showBucketSetupHint = useMemo(
    () => !loading && !hasAnyAsset,
    [hasAnyAsset, loading]
  )

  const loadAssets = async () => {
    setLoading(true)
    setMessage('Cargando recursos…')

    try {
      const heroPromise = supabase.storage
        .from(BUCKET)
        .list(HERO_FOLDER, { limit: 30, offset: 0, sortBy: { column: 'created_at', order: 'desc' } })
      const galleryPromise = supabase.storage
        .from(BUCKET)
        .list(GALLERY_FOLDER, { limit: 90, offset: 0, sortBy: { column: 'created_at', order: 'desc' } })

      const [heroResult, galleryResult] = await Promise.all([heroPromise, galleryPromise])

      if (heroResult.error && heroResult.error.message) {
        throw new Error(heroResult.error.message)
      }

      if (galleryResult.error && galleryResult.error.message) {
        throw new Error(galleryResult.error.message)
      }

      const heroEntries = (heroResult.data ?? []) as StorageEntry[]
      const galleryEntries = (galleryResult.data ?? []) as StorageEntry[]

      const updatedAssets = createEmptyAssetMap()

      const latestHero = findLatestForPrefix(heroEntries, HERO_SLOT.prefix)
      if (latestHero?.name) {
        const path = `${HERO_SLOT.folder}/${latestHero.name}`
        updatedAssets.hero = {
          path,
          previewUrl: await getPreviewUrl(path, HERO_SLOT.previewWidth, HERO_SLOT.previewHeight),
          createdAtLabel: formatDate(latestHero.updated_at ?? latestHero.created_at),
          sizeLabel: formatBytes((latestHero.metadata as { size?: number } | null)?.size ?? undefined),
        }
      }

      await Promise.all(
        IG_SLOTS.map(async (slot) => {
          const latest = findLatestForPrefix(galleryEntries, slot.prefix)
          if (!latest?.name) return
          const path = `${slot.folder}/${latest.name}`
          updatedAssets[slot.id] = {
            path,
            previewUrl: await getPreviewUrl(path, slot.previewWidth, slot.previewHeight),
            createdAtLabel: formatDate(latest.updated_at ?? latest.created_at),
            sizeLabel: formatBytes((latest.metadata as { size?: number } | null)?.size ?? undefined),
          }
        })
      )

      setSlotAssets(updatedAssets)
      const totalAssets = Object.values(updatedAssets).filter(Boolean).length
      setMessage(`Se cargaron ${totalAssets} recursos ✔️`)
    } catch (error) {
      console.error(error)
      setSlotAssets(createEmptyAssetMap())
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

  const handleUpload = async (slot: SlotDefinition, file: File) => {
    setLoading(true)
    setMessage(`Subiendo ${slot.label.toLowerCase()}…`)

    try {
      const extension = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : ''
      const path = `${slot.folder}/${slot.prefix}-${Date.now()}${extension}`
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: true, contentType: file.type })

      if (error) throw error

      const previous = slotAssets[slot.id]
      if (previous?.path && previous.path !== path) {
        await supabase.storage.from(BUCKET).remove([previous.path])
      }

      setMessage(`${slot.label} actualizado ✔️`)
      await loadAssets()
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Error desconocido'
      setMessage(`No se pudo subir ${slot.label.toLowerCase()}: ${reason}`)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (slot: SlotDefinition) => {
    const asset = slotAssets[slot.id]
    if (!asset) return

    setLoading(true)
    setMessage(`Eliminando ${slot.label.toLowerCase()}…`)

    try {
      const { error } = await supabase.storage.from(BUCKET).remove([asset.path])
      if (error) throw error
      setMessage(`${slot.label} eliminado ✔️`)
      await loadAssets()
    } catch (error) {
      const reason = error instanceof Error ? error.message : 'Error desconocido'
      setMessage(`No se pudo eliminar ${slot.label.toLowerCase()}: ${reason}`)
    } finally {
      setLoading(false)
    }
  }

  const heroAsset = slotAssets.hero

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
          Prepara el bucket público <code>{BUCKET}</code> con las carpetas <code>{HERO_FOLDER}</code> y <code>{GALLERY_FOLDER}</code>
          {' '}usando los prefijos <code>{HERO_PREFIX}</code> e <code>ig-1</code>…<code>ig-9</code> para comenzar.
        </div>
      )}

      <section className="grid gap-8 lg:grid-cols-2">
        <article className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
          <header>
            <h2 className="text-xl font-semibold text-gray-900">{HERO_SLOT.label}</h2>
            <p className="text-sm text-gray-600">{HERO_SLOT.description}</p>
          </header>

          <label className="block cursor-pointer rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-600 hover:border-gray-400">
            <span className="font-medium text-gray-700">Subir nueva imagen</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={loading}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void handleUpload(HERO_SLOT, file)
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
                    onClick={() => void handleDelete(HERO_SLOT)}
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

        <article className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm lg:col-span-2">
          <header className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900">Galería (9 miniaturas fijas)</h2>
            <p className="text-sm text-gray-600">
              Actualiza las imágenes <code>ig-1</code> a <code>ig-9</code> que alimentan la grilla de Instagram del home.
            </p>
          </header>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {IG_SLOTS.map((slot) => {
              const asset = slotAssets[slot.id]
              return (
                <div key={slot.id} className="space-y-3 rounded-xl border bg-gray-50 p-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{slot.label}</h3>
                    <p className="text-xs text-gray-600">{slot.description}</p>
                  </div>

                  <label className="block cursor-pointer rounded-lg border border-dashed border-gray-300 p-3 text-center text-xs text-gray-600 hover:border-gray-400">
                    <span className="font-medium text-gray-700">Cambiar imagen</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={loading}
                      onChange={(event) => {
                        const file = event.target.files?.[0]
                        event.target.value = ''
                        if (file) void handleUpload(slot, file)
                      }}
                    />
                  </label>

                  <div className="overflow-hidden rounded-lg border bg-white">
                    <div className="flex aspect-square items-center justify-center bg-gray-100">
                      {asset?.previewUrl ? (
                        <img src={asset.previewUrl} alt={`Vista previa ${slot.label}`} className="h-full w-full object-cover" loading="lazy" />
                      ) : (
                        <span className="text-xs text-gray-500">Sin vista previa</span>
                      )}
                    </div>
                    <div className="space-y-1 p-3 text-xs">
                      <p className="font-medium text-gray-900">{asset?.path ?? `${slot.folder}/${slot.prefix}`}</p>
                      {asset?.createdAtLabel && <p className="text-[10px] text-gray-500">Actualizado el {asset.createdAtLabel}</p>}
                      {asset?.sizeLabel && <p className="text-[10px] text-gray-500">Peso: {asset.sizeLabel}</p>}
                      <div className="flex flex-wrap gap-2 pt-2">
                        {asset?.previewUrl && (
                          <a
                            href={asset.previewUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] font-semibold text-blue-600 hover:underline"
                          >
                            Abrir original
                          </a>
                        )}
                        {asset && (
                          <button
                            type="button"
                            className="text-[10px] font-semibold text-red-600 hover:underline"
                            onClick={() => void handleDelete(slot)}
                            disabled={loading}
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </article>
      </section>
    </main>
  )
}
