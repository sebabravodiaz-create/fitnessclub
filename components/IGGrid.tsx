'use client'

import { useEffect, useMemo, useState } from 'react'

type IGGridProps = {
  images?: string[]
}

const FALLBACK_IMAGES = Array.from({ length: 9 }).map((_, index) => `/images/ig-${index + 1}.png`)

function IGThumb({ src, index }: { src: string; index: number }) {
  const isLocalAsset = useMemo(() => src.startsWith('/'), [src])
  const [currentSrc, setCurrentSrc] = useState<string>(src)
  const [triedJpg, setTriedJpg] = useState(false)

  useEffect(() => {
    setCurrentSrc(src)
    setTriedJpg(false)
  }, [src])

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg">
      <img
        src={currentSrc}
        alt={`IG ${index}`}
        loading={index > 3 ? 'lazy' : 'eager'} // primeras 3 priorizadas
        className="h-full w-full object-cover transition-transform hover:scale-105"
        onError={() => {
          if (isLocalAsset && !triedJpg && currentSrc.endsWith('.png')) {
            setTriedJpg(true)
            setCurrentSrc(currentSrc.replace('.png', '.jpg'))
          }
        }}
      />
    </div>
  )
}

export default function IGGrid({ images }: IGGridProps) {
  const items = images && images.length > 0 ? images : FALLBACK_IMAGES

  return (
    <section id="galeria" className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="mb-6 text-2xl font-semibold">Galería</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((src, i) => (
          <IGThumb key={src ?? i} src={src} index={i + 1} />
        ))}
      </div>
    </section>
  )
}
