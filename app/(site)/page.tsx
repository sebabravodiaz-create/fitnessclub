'use client'
import Image from 'next/image'
import { useEffect, useMemo, useState } from 'react'
import AccessButtons from '@/components/AccessButtons'
import IGGrid from '@/components/IGGrid'
import WhatsAppSticky from '@/components/WhatsAppSticky'
import { supabase } from '@/lib/supabaseClient'

type HeroAsset = { src: string; alt: string }
type GalleryItem = { src: string; alt: string }

const FALLBACK_HERO: HeroAsset = { src: '/images/hero.png', alt: 'Entrenamiento' }
const FALLBACK_GALLERY: GalleryItem[] = Array.from({ length: 9 }).map((_, index) => ({
  src: `/images/ig-${index + 1}.png`,
  alt: `Galería ${index + 1}`,
}))
const HERO_TAG = 'home:hero'
const GALLERY_TAGS = Array.from({ length: 9 }).map((_, index) => `home:gallery:${index + 1}`)

function useHomeAssets() {
  const [hero, setHero] = useState<HeroAsset>(FALLBACK_HERO)
  const [gallery, setGallery] = useState<GalleryItem[]>(FALLBACK_GALLERY)

  useEffect(() => {
    let cancelled = false

    const loadAssets = async () => {
      try {
        const { data: heroRows, error: heroError } = await supabase
          .from('media_assets')
          .select('bucket, path, alt')
          .contains('tags', [HERO_TAG])
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
        if (heroError) throw heroError
        const heroAsset = heroRows?.[0]
        let nextHero = FALLBACK_HERO
        if (heroAsset) {
          const { data } = supabase.storage.from(heroAsset.bucket).getPublicUrl(heroAsset.path, {
            transform: { width: 2400, quality: 80, format: 'webp' },
          })
          if (data?.publicUrl) {
            nextHero = {
              src: data.publicUrl,
              alt: heroAsset.alt || FALLBACK_HERO.alt,
            }
          }
        }
        if (!cancelled) {
          setHero(nextHero)
        }

        const galleryResults = await Promise.all(
          GALLERY_TAGS.map(async (tag, index) => {
            try {
              const { data: rows, error } = await supabase
                .from('media_assets')
                .select('bucket, path, alt')
                .contains('tags', [tag])
                .eq('is_active', true)
                .order('created_at', { ascending: false })
                .limit(1)
              if (error) throw error
              const asset = rows?.[0]
              if (!asset) return FALLBACK_GALLERY[index]
              const { data } = supabase.storage.from(asset.bucket).getPublicUrl(asset.path, {
                transform: { width: 1200, quality: 80, format: 'webp' },
              })
              const url = data?.publicUrl
              if (!url) return FALLBACK_GALLERY[index]
              return {
                src: url,
                alt: asset.alt || FALLBACK_GALLERY[index].alt,
              }
            } catch (error) {
              console.warn(`No se pudo cargar tag ${tag}`, error)
              return FALLBACK_GALLERY[index]
            }
          })
        )

        if (!cancelled) {
          setGallery(galleryResults)
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

  return { hero, gallery }
}

function HeroImage({ src, alt }: { src: string; alt: string }) {
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
      alt={alt}
      fill
      className="object-cover"
      priority
      onError={() => {
        if (!triedFallback) {
          setTriedFallback(true)
          setCurrentSrc(isLocalAsset ? '/images/hero.jpg' : FALLBACK_HERO.src)
        }
      }}
    />
  )
}

export default function HomePage() {
  const { hero, gallery } = useHomeAssets()

  return (
    <>
      <section className="relative h-[25vh] grid place-items-center">
        <HeroImage src={hero.src} alt={hero.alt} />
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

      <IGGrid images={gallery} />

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

