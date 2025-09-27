'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

import { supabase } from '@/lib/supabaseClient'

const BUCKET = 'home-assets'

type ManagedImage = {
  name: string
  url: string
  created_at?: string | null
  path: string
} | null

type UploadStatus = string

const SECTIONS = [
  {
    id: 'hero',
    title: 'Hero principal',
    description: 'Imagen principal del home (fondo del hero).',
    folder: 'hero',
    fallback: '/images/hero.png',
  },
  ...Array.from({ length: 9 }).map((_, index) => {
    const displayIndex = index + 1
    return {
      id: `ig-${displayIndex}`,
      title: `Imagen IG ${displayIndex}`,
      description: 'Se muestra en la cuadrícula de Instagram del home.',
      folder: `gallery/ig-${displayIndex}`,
      fallback: `/images/ig-${displayIndex}.png`,
    }
  }),
]

function useHomeStorage() {
  const [images, setImages] = useState<Record<string, ManagedImage>>({})
  const [status, setStatus] = useState<UploadStatus>('')
  const [loading, setLoading] = useState(false)

  const refresh = async () => {
    setLoading(true)
    setStatus('Cargando archivos…')
    try {
      const bucket = supabase.storage.from(BUCKET)

      const results = await Promise.all(
        SECTIONS.map(async (section) => {
          try {
            const { data, error } = await bucket.list(section.folder, {
              limit: 1,
              sortBy: { column: 'created_at', order: 'desc' },
            })
            if (error) throw error
            const file = data?.[0]
            if (!file || !file.name) return [section.id, null] as const
            const { data: urlData } = bucket.getPublicUrl(`${section.folder}/${file.name}`)
            return [
              section.id,
              {
                name: file.name,
                created_at: file.created_at,
                path: `${section.folder}/${file.name}`,
                url: urlData.publicUrl,
              } satisfies NonNullable<ManagedImage>,
            ] as const
          } catch (error) {
            console.error(`No se pudo cargar ${section.id}`, error)
            return [section.id, null] as const
          }
        })
      )

      setImages(Object.fromEntries(results))
      setStatus('Listo ✔️')
    } catch (error: any) {
      console.error(error)
      setStatus(error.message || 'No se pudieron cargar los archivos')
      setImages({})
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  return {
    images,
    refresh,
    status,
    setStatus,
    loading,
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
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const [uploadingSection, setUploadingSection] = useState<string | null>(null)
  const { images, refresh, status, setStatus, loading } = useHomeStorage()

  const uploading = useMemo(() => Boolean(uploadingSection), [uploadingSection])

  const uploadImage = async (sectionId: string) => {
    const section = SECTIONS.find((item) => item.id === sectionId)
    if (!section) return

    const file = inputRefs.current[sectionId]?.files?.[0]
    if (!file) {
      setStatus('Selecciona una imagen para subir')
      return
    }

    if (!file.type.startsWith('image/')) {
      setStatus('El archivo debe ser una imagen')
      return
    }

    const bucket = supabase.storage.from(BUCKET)
    const ext = file.name.split('.').pop() || 'jpg'
    const filename = `actual.${ext}`
    const path = `${section.folder}/${filename}`

    setUploadingSection(sectionId)
    setStatus(`Subiendo ${section.title}…`)

    try {
      let toRemove: string[] = []
      try {
        const { data: existingFiles } = await bucket.list(section.folder)
        toRemove = existingFiles?.map((fileEntry) => `${section.folder}/${fileEntry.name}`) ?? []
      } catch (error) {
        console.warn(`No se pudo listar ${section.folder} antes de subir`, error)
      }

      if (toRemove.length) {
        const { error } = await bucket.remove(toRemove)
        if (error) throw error
      }

      const { error } = await bucket.upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type,
      })

      if (error) throw error

      if (inputRefs.current[sectionId]) {
        inputRefs.current[sectionId]!.value = ''
      }

      setStatus(`${section.title} actualizada ✔️`)
      await refresh()
    } catch (error: any) {
      console.error(error)
      setStatus(error.message || `No se pudo subir ${section.title}`)
    } finally {
      setUploadingSection(null)
    }
  }

  const removeImage = async (sectionId: string) => {
    const section = SECTIONS.find((item) => item.id === sectionId)
    const image = section ? images[section.id] : null
    if (!section || !image) return

    setUploadingSection(sectionId)
    setStatus(`Eliminando ${section.title}…`)

    try {
      const { error } = await supabase.storage.from(BUCKET).remove([image.path])
      if (error) throw error
      setStatus(`${section.title} eliminada ✔️`)
      await refresh()
    } catch (error: any) {
      console.error(error)
      setStatus(error.message || `No se pudo eliminar ${section.title}`)
    } finally {
      setUploadingSection(null)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <button onClick={() => router.back()} className="text-sm underline">
          ← Volver
        </button>
        <h1 className="flex-1 text-center text-2xl font-bold">Imágenes del home</h1>
        <div className="w-[120px]" />
      </div>

      <p className="mb-6 text-sm text-gray-600">
        Sube y actualiza las imágenes que se muestran en la landing. Cada sección corresponde a
        un espacio específico del sitio.
      </p>

      <div className="grid gap-6">
        {SECTIONS.map((section) => {
          const image = images[section.id]
          return (
            <section key={section.id} className="rounded-2xl bg-white p-6 shadow">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-[240px] flex-1">
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  <p className="mt-1 text-sm text-gray-600">{section.description}</p>
                  <label className="mt-4 block text-sm font-medium">Seleccionar imagen</label>
                  <input
                    ref={(element) => {
                      inputRefs.current[section.id] = element
                    }}
                    type="file"
                    accept="image/*"
                    className="mt-1 w-full rounded border px-3 py-2"
                    disabled={uploading}
                  />
                  <button
                    onClick={() => uploadImage(section.id)}
                    className="mt-3 inline-flex items-center gap-2 rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                    disabled={uploading}
                  >
                    Guardar {section.id === 'hero' ? 'hero' : 'imagen'}
                  </button>
                  {image && (
                    <button
                      onClick={() => removeImage(section.id)}
                      className="ml-4 inline-flex items-center text-sm text-red-600 underline disabled:opacity-50"
                      disabled={uploading}
                    >
                      Eliminar
                    </button>
                  )}
                  <p className="mt-2 text-xs text-gray-500">
                    La imagen reemplaza al archivo del bucket en <code>{section.folder}</code>.
                  </p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="relative h-40 w-40 overflow-hidden rounded-lg border bg-gray-50">
                    <img
                      src={image?.url ?? section.fallback}
                      alt={section.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    {image ? `Actualizado: ${formatDate(image.created_at)}` : 'Usando imagen por defecto'}
                  </p>
                  {image && (
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs underline"
                    >
                      Ver en nueva pestaña
                    </a>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      {!!status && (
        <p className="mt-6 text-sm text-gray-600">
          {status}
          {loading ? '…' : ''}
        </p>
      )}
    </main>
  )
}
