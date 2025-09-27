'use client'

import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import AccessButtons from '@/components/AccessButtons'
import IGGrid from '@/components/IGGrid'
import WhatsAppSticky from '@/components/WhatsAppSticky'
import { supabase } from '@/lib/supabaseClient'

const BUCKET = 'home-assets'
const HERO_FOLDER = 'hero'
const GALLERY_FOLDER = 'gallery'
const HERO_FALLBACKS = ['/images/hero.png', '/images/hero.jpg']

type HomeAssetsState = {
  heroUrl: string | null
  galleryUrls: string[]
  loading: boolean
  error: string | null
}

function getPublicUrl(path: string, transform: { width: number; height?: number; resize?: 'contain' | 'cover' }) {
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path, {
    transform,
  })
  return data?.publicUrl ?? null
}

function useHomeAssets(): HomeAssetsState {
  const [state, setState] = useState<HomeAssetsState>({
    heroUrl: null,
    galleryUrls: [],
    loading: true,
    error: null,
  })

  useEffect(() => {
    let cancelled = false

    const loadAssets = async () => {
      try {
        setState((current) => ({ ...current, loading: true, error: null }))

        const heroPromise = supabase.storage
          .from(BUCKET)
          .list(HERO_FOLDER, { limit: 5, offset: 0, sortBy: { column: 'created_at', order: 'desc' } })
        const galleryPromise = supabase.storage
          .from(BUCKET)
          .list(GALLERY_FOLDER, { limit: 30, offset: 0, sortBy: { column: 'created_at', order: 'desc' } })

        const [heroResult, galleryResult] = await Promise.allSettled([heroPromise, galleryPromise])

        if (cancelled) return

        let heroUrl: string | null = null
        if (heroResult.status === 'fulfilled' && !heroResult.value.error) {
          const entry = heroResult.value.data?.find((item) => item.name)
          if (entry?.name) {
            heroUrl = getPublicUrl(`${HERO_FOLDER}/${entry.name}`, {
              width: 1600,
              height: 900,
              resize: 'cover',
            })
          }
        }

        const galleryUrls: string[] = []
        if (galleryResult.status === 'fulfilled' && !galleryResult.value.error) {
          for (const entry of galleryResult.value.data ?? []) {
            if (!entry.name) continue
            const url = getPublicUrl(`${GALLERY_FOLDER}/${entry.name}`, {
              width: 900,
              height: 900,
              resize: 'cover',
            })
            if (url) galleryUrls.push(url)
          }
        }

        const heroError = heroResult.status === 'fulfilled' ? heroResult.value.error : heroResult.reason
        const galleryError = galleryResult.status === 'fulfilled' ? galleryResult.value.error : galleryResult.reason
        const errorMessage =
          heroError || galleryError
            ? 'No se pudieron cargar todas las imágenes del home. Revisa el bucket público home-assets.'
            : null

        setState({
          heroUrl,
          galleryUrls,
          loading: false,
          error: errorMessage,
        })
      } catch (error) {
        if (cancelled) return
        console.error(error)
        setState({
          heroUrl: null,
          galleryUrls: [],
          loading: false,
          error: 'No fue posible consultar las imágenes del home.',
        })
      }
    }

    void loadAssets()

    return () => {
      cancelled = true
    }
  }, [])

  return state
}

function HeroImage({ heroUrl }: { heroUrl: string | null }) {
  const sources = useMemo(() => {
    if (heroUrl) {
      return [heroUrl, ...HERO_FALLBACKS]
    }
    return HERO_FALLBACKS
  }, [heroUrl])

  const [index, setIndex] = useState(0)

  useEffect(() => {
    setIndex(0)
  }, [heroUrl])

  const src = sources[Math.min(index, sources.length - 1)]

  return (
    <Image
      src={src}
      alt="Entrenamiento"
      fill
      className="object-cover"
      priority
      sizes="100vw"
      onError={() => {
        setIndex((current) => (current < sources.length - 1 ? current + 1 : current))
      }}
    />
  )
}

export default function HomePage() {
  const { heroUrl, galleryUrls, loading, error } = useHomeAssets()

  return (
    <>
      <section className="relative grid h-[25vh] place-items-center">
        <HeroImage heroUrl={heroUrl} />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 px-6 text-center text-white">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-5xl">Disciplina, técnica y comunidad</h1>
          <p className="mx-auto mt-4 max-w-2xl opacity-90">
            Entrena con nosotros y alcanza tus objetivos. Clases para todos los niveles.
          </p>
          <AccessButtons />
        </div>
      </section>

      {error && (
        <div className="mx-auto mt-6 max-w-3xl px-4">
          <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>
        </div>
      )}

      <section id="clases" className="mx-auto grid max-w-6xl gap-6 px-4 py-12 md:grid-cols-3">
        {[
          {
            title: 'Iniciación',
            desc: 'Fundamentos técnicos y acondicionamiento general.',
          },
          {
            title: 'Intermedio',
            desc: 'Perfecciona tu técnica y mejora tu rendimiento.',
          },
          {
            title: 'Avanzado',
            desc: 'Trabajo táctico, sparring controlado y alto desempeño.',
          },
        ].map((card) => (
          <div key={card.title} className="rounded-2xl bg-white p-6 shadow">
            <h3 className="text-xl font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm opacity-80">{card.desc}</p>
          </div>
        ))}
      </section>

      <IGGrid images={galleryUrls} isLoading={loading} />

      <section id="contacto" className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl bg-white p-6 shadow">
          <h2 className="text-2xl font-semibold">Contacto</h2>
          <p className="mt-2">
            Escríbenos por Instagram{' '}
            <a className="underline" href="https://www.instagram.com/club.grulla.blanca/" target="_blank">
              @club.grulla.blanca
            </a>{' '}
            o por WhatsApp.
          </p>
        </div>
      </section>

      <WhatsAppSticky />
    </>
  )
}
