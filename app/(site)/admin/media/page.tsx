'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { supabase } from '@/lib/supabaseClient'

const BUCKET = 'media'

const HOME_SECTIONS = [
  {
    id: 'home-hero',
    title: 'Hero principal',
    description: 'Imagen de fondo del hero en la landing.',
    folder: 'hero',
    tags: ['home:hero', 'home'],
    fallback: '/images/hero.png',
    hint: 'Sugerido 2400×1350 px',
  },
  ...Array.from({ length: 9 }).map((_, index) => {
    const position = index + 1
    return {
      id: `home-gallery-${position}`,
      title: `Imagen galería ${position}`,
      description: 'Se muestra en la cuadrícula de la landing.',
      folder: `gallery/home-${position}`,
      tags: ['home:gallery', `home:gallery:${position}`, 'home'],
      fallback: `/images/ig-${position}.png`,
      hint: 'Sugerido 1200×1200 px',
    }
  }),
] as const

type Section = (typeof HOME_SECTIONS)[number]

type MediaAsset = {
  id: string
  bucket: string
  path: string
  title: string | null
  alt: string | null
  tags: string[] | null
  width: number | null
  height: number | null
  format: string | null
  bytes: number | null
  created_at: string
}

type SectionState = {
  asset: MediaAsset | null
  url: string | null
  titleInput: string
  altInput: string
}

function getFileExtension(file: File) {
  const fromName = file.name.split('.').pop()
  if (fromName && /[a-z0-9]/i.test(fromName)) return fromName.toLowerCase()
  const fromType = file.type.split('/').pop()
  if (fromType) return fromType.toLowerCase()
  return 'jpg'
}

async function getImageDimensions(file: File) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      resolve({ width: img.width, height: img.height })
      URL.revokeObjectURL(objectUrl)
    }
    img.onerror = (event) => {
      URL.revokeObjectURL(objectUrl)
      reject(event)
    }
    img.src = objectUrl
  })
}

function createUniqueFilename(section: Section, extension: string) {
  const id =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`
  return `${section.folder}/${id}.${extension}`
}

function formatBytes(value?: number | null) {
  if (!value) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  let size = value
  let unit = 0
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024
    unit += 1
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`
}

function formatDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString()
}

export default function MediaAdminPage() {
  const [sections, setSections] = useState<Record<string, SectionState>>(() => {
    return HOME_SECTIONS.reduce<Record<string, SectionState>>((acc, section) => {
      acc[section.id] = {
        asset: null,
        url: null,
        titleInput: section.title,
        altInput: section.title,
      }
      return acc
    }, {})
  })
  const [status, setStatus] = useState('Cargando…')
  const [busySection, setBusySection] = useState<string | null>(null)
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const refresh = useCallback(async () => {
    setStatus('Cargando…')
    try {
      const results = await Promise.all(
        HOME_SECTIONS.map(async (section) => {
          const { data, error } = await supabase
            .from('media_assets')
            .select('*')
            .contains('tags', [section.tags[0]])
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
          if (error) throw error
          const asset = data?.[0] ?? null
          if (!asset) {
            return [section.id, null] as const
          }
          const { data: publicData } = supabase.storage
            .from(asset.bucket)
            .getPublicUrl(asset.path, {
              transform: { width: 1600, quality: 80, format: 'webp' },
            })
          const publicUrl = publicData?.publicUrl ?? null
          return [
            section.id,
            {
              asset,
              url: publicUrl,
              titleInput: asset.title ?? section.title,
              altInput: asset.alt ?? section.title,
            },
          ] as const
        })
      )

      setSections((prev) => {
        const next = { ...prev }
        for (const [sectionId, entry] of results) {
          const section = HOME_SECTIONS.find((item) => item.id === sectionId)
          if (!section) continue
          next[sectionId] =
            entry ?? {
              asset: null,
              url: null,
              titleInput: section.title,
              altInput: section.title,
            }
        }
        return next
      })
      setStatus('Listo ✔️')
    } catch (error: any) {
      console.error(error)
      setStatus(error.message || 'No se pudieron cargar los assets')
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const uploading = useMemo(() => Boolean(busySection), [busySection])

  const handleUpload = async (section: Section) => {
    const file = fileInputs.current[section.id]?.files?.[0]
    if (!file) {
      setStatus('Selecciona un archivo para subir')
      return
    }

    if (!file.type.startsWith('image/')) {
      setStatus('Solo se admiten imágenes')
      return
    }

    setBusySection(section.id)
    setStatus(`Subiendo ${section.title}…`)

    try {
      const extension = getFileExtension(file)
      const path = createUniqueFilename(section, extension)
      const [{ width, height }] = await Promise.all([
        getImageDimensions(file),
      ])

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, {
          contentType: file.type,
          upsert: false,
          cacheControl: '3600',
        })
      if (uploadError) throw uploadError

      const previous = sections[section.id]?.asset
      if (previous) {
        const { error: deactivateError } = await supabase
          .from('media_assets')
          .update({ is_active: false })
          .eq('id', previous.id)
        if (deactivateError) throw deactivateError
      }

      const { data: authData } = await supabase.auth.getUser()

      const payload = {
        bucket: BUCKET,
        path,
        title: sections[section.id]?.titleInput || section.title,
        alt: sections[section.id]?.altInput || section.title,
        tags: section.tags,
        width,
        height,
        format: extension,
        bytes: file.size,
        created_by: authData?.user?.id ?? null,
      }

      const { error: insertError } = await supabase
        .from('media_assets')
        .insert(payload)
      if (insertError) throw insertError

      if (fileInputs.current[section.id]) {
        fileInputs.current[section.id]!.value = ''
      }

      setStatus(`${section.title} actualizada ✔️`)
      await refresh()
    } catch (error: any) {
      console.error(error)
      setStatus(error.message || `No se pudo subir ${section.title}`)
    } finally {
      setBusySection(null)
    }
  }

  const handleMetadataUpdate = async (section: Section) => {
    const current = sections[section.id]?.asset
    if (!current) {
      setStatus('No hay imagen activa para actualizar')
      return
    }

    setBusySection(section.id)
    setStatus(`Guardando metadatos de ${section.title}…`)

    try {
      const { error } = await supabase
        .from('media_assets')
        .update({
          title: sections[section.id]?.titleInput || null,
          alt: sections[section.id]?.altInput || null,
        })
        .eq('id', current.id)
      if (error) throw error
      setStatus(`Metadatos de ${section.title} actualizados ✔️`)
      await refresh()
    } catch (error: any) {
      console.error(error)
      setStatus(error.message || 'No se pudieron guardar los metadatos')
    } finally {
      setBusySection(null)
    }
  }

  const handleDeactivate = async (section: Section) => {
    const current = sections[section.id]?.asset
    if (!current) return

    setBusySection(section.id)
    setStatus(`Desactivando ${section.title}…`)

    try {
      const { error } = await supabase
        .from('media_assets')
        .update({ is_active: false })
        .eq('id', current.id)
      if (error) throw error
      setStatus(`${section.title} desactivada ✔️`)
      await refresh()
    } catch (error: any) {
      console.error(error)
      setStatus(error.message || `No se pudo desactivar ${section.title}`)
    } finally {
      setBusySection(null)
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold text-center">Media del sitio</h1>
      <p className="mt-2 text-sm text-gray-600 text-center">
        Administra los assets del home. Los archivos se suben al bucket <code>{BUCKET}</code> y
        se registran en la tabla <code>media_assets</code>.
      </p>

      <div className="mt-8 grid gap-6">
        {HOME_SECTIONS.map((section) => {
          const state = sections[section.id]
          return (
            <section key={section.id} className="rounded-2xl bg-white p-6 shadow">
              <div className="flex flex-wrap gap-6">
                <div className="flex-1 min-w-[240px]">
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  <p className="mt-1 text-sm text-gray-600">{section.description}</p>
                  <p className="mt-1 text-xs text-gray-500">{section.hint}</p>

                  <label className="mt-4 block text-sm font-medium">Título</label>
                  <input
                    type="text"
                    value={state?.titleInput ?? ''}
                    onChange={(event) =>
                      setSections((prev) => ({
                        ...prev,
                        [section.id]: {
                          ...(prev[section.id] ?? {
                            asset: null,
                            url: null,
                            titleInput: '',
                            altInput: '',
                          }),
                          titleInput: event.target.value,
                        },
                      }))
                    }
                    className="mt-1 w-full rounded border px-3 py-2"
                    placeholder={section.title}
                    disabled={uploading}
                  />

                  <label className="mt-4 block text-sm font-medium">Texto alternativo</label>
                  <input
                    type="text"
                    value={state?.altInput ?? ''}
                    onChange={(event) =>
                      setSections((prev) => ({
                        ...prev,
                        [section.id]: {
                          ...(prev[section.id] ?? {
                            asset: null,
                            url: null,
                            titleInput: '',
                            altInput: '',
                          }),
                          altInput: event.target.value,
                        },
                      }))
                    }
                    className="mt-1 w-full rounded border px-3 py-2"
                    placeholder={section.title}
                    disabled={uploading}
                  />

                  <label className="mt-4 block text-sm font-medium">Archivo</label>
                  <input
                    ref={(element) => {
                      fileInputs.current[section.id] = element
                    }}
                    type="file"
                    accept="image/*"
                    className="mt-1 w-full rounded border px-3 py-2"
                    disabled={uploading}
                  />

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleUpload(section)}
                      className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
                      disabled={uploading}
                    >
                      Subir imagen
                    </button>
                    {state?.asset && (
                      <>
                        <button
                          onClick={() => handleMetadataUpdate(section)}
                          className="text-sm underline disabled:opacity-50"
                          disabled={uploading}
                        >
                          Guardar metadatos
                        </button>
                        <button
                          onClick={() => handleDeactivate(section)}
                          className="text-sm text-red-600 underline disabled:opacity-50"
                          disabled={uploading}
                        >
                          Desactivar
                        </button>
                      </>
                    )}
                  </div>

                  <p className="mt-2 text-xs text-gray-500">
                    Tags: {section.tags.join(', ')}
                  </p>
                </div>

                <div className="flex w-full max-w-[260px] flex-col items-center gap-3">
                  <div className="relative h-48 w-full overflow-hidden rounded-xl border bg-gray-50">
                    <img
                      src={state?.url ?? section.fallback}
                      alt={state?.altInput ?? section.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  {state?.asset ? (
                    <div className="w-full text-xs text-gray-600">
                      <p>ID: {state.asset.id}</p>
                      <p>
                        Archivo: <code>{state.asset.path}</code>
                      </p>
                      <p>
                        Peso: {formatBytes(state.asset.bytes)} · Dimensiones:{' '}
                        {state.asset.width}×{state.asset.height}px
                      </p>
                      <p>Actualizado: {formatDate(state.asset.created_at)}</p>
                      {state.url && (
                        <a
                          href={state.url}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-block text-xs underline"
                        >
                          Abrir imagen
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">Usando fallback</p>
                  )}
                </div>
              </div>
            </section>
          )
        })}
      </div>

      <p className="mt-6 text-sm text-gray-600">{status}</p>
    </main>
  )
}
