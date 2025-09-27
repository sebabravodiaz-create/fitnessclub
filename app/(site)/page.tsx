'use client'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import AccessButtons from '@/components/AccessButtons'
import IGGrid from '@/components/IGGrid'
import WhatsAppSticky from '@/components/WhatsAppSticky'
import { supabase } from '@/lib/supabaseClient'

const FALLBACK_HERO = '/images/hero.png'
const FALLBACK_GALLERY = Array.from({ length: 9 }).map((_, index) => `/images/ig-${index + 1}.png`)
const GALLERY_FOLDERS = Array.from({ length: 9 }).map((_, index) => `gallery/ig-${index + 1}`)

function useHomeAssets() {
  const [heroUrl, setHeroUrl] = useState(FALLBACK_HERO)
  const [galleryUrls, setGalleryUrls] = useState<string[]>(FALLBACK_GALLERY)

  useEffect(() => {
    let cancelled = false

    const loadAssets = async () => {
      try {
        const bucket = supabase.storage.from('home-assets')

        const { data: heroFiles, error: heroError } = await bucket.list('hero', {
          limit: 1,
          sortBy: { column: 'created_at', order: 'desc' },
        })
        if (heroError) throw heroError
        if (!cancelled && heroFiles && heroFiles.length) {
          const { data } = bucket.getPublicUrl(`hero/${heroFiles[0].name}`)
          if (data?.publicUrl) setHeroUrl(data.publicUrl)
        }

        const galleryResults = await Promise.all(
          GALLERY_FOLDERS.map(async (folder, index) => {
            try {
              const { data: files, error } = await bucket.list(folder, {
                limit: 1,
                sortBy: { column: 'created_at', order: 'desc' },
              })
              if (error) throw error
              const file = files?.[0]
              if (!file || !file.name) return FALLBACK_GALLERY[index]
              const { data } = bucket.getPublicUrl(`${folder}/${file.name}`)
              return data.publicUrl ?? FALLBACK_GALLERY[index]
            } catch (error) {
              console.warn(`No se pudo cargar ${folder}`, error)
              return FALLBACK_GALLERY[index]
            }
          })
        )

        if (!cancelled) {
          setGalleryUrls(galleryResults)
        }
      } catch (error) {
        console.warn('No se pudieron cargar las imágenes del home', error)
      }
    }

    loadAssets()

    return () => {
      cancelled = true
    }
  }, [])

  return { heroUrl, galleryUrls }
}

function HeroImage({ src }: { src: string }) {
  const isLocalAsset = useMemo(() => src.startsWith('/'), [src])
  const [currentSrc, setCurrentSrc] = useState(src)
  const [triedFallback, setTriedFallback] = useState(false)

  useEffect(() => {
    setCurrentSrc(src)
    setTriedFallback(false)
  }, [src])

  return (
    <Image
      src={currentSrc}
      alt="Entrenamiento"
      fill
      className="object-cover"
      priority
      onError={() => {
        if (!triedFallback) {
          setTriedFallback(true)
          setCurrentSrc(isLocalAsset ? '/images/hero.jpg' : FALLBACK_HERO)
        }
      }}
    />
  )
}

export default function HomePage() {
  const { heroUrl, galleryUrls } = useHomeAssets()

  return (
    <>
      <section className="relative h-[25vh] grid place-items-center">
        <HeroImage src={heroUrl} />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative z-10 text-center text-white px-6">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
            Disciplina, técnica y comunidad
          </h1>
          <p className="mt-4 max-w-2xl mx-auto opacity-90">
            Entrena con nosotros y alcanza tus objetivos. Clases para todos los niveles.
          </p>
          <AccessButtons />
        </div>
      </section>

      <section
        id="clases"
        className="max-w-6xl mx-auto px-4 py-12 grid md:grid-cols-3 gap-6"
      >
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
          <div key={card.title} className="p-6 rounded-2xl bg-white shadow">
            <h3 className="text-xl font-semibold">{card.title}</h3>
            <p className="mt-2 text-sm opacity-80">{card.desc}</p>
          </div>
        ))}
      </section>

      <IGGrid images={galleryUrls} />

      <section id="contacto" className="max-w-6xl mx-auto px-4 py-12">
        <div className="rounded-2xl bg-white shadow p-6">
          <h2 className="text-2xl font-semibold">Contacto</h2>
          <p className="mt-2">
            Escríbenos por Instagram{' '}
            <a
              className="underline"
              href="https://www.instagram.com/club.grulla.blanca/"
              target="_blank"
            >
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

