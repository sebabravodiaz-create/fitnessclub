'use client'

import { useState } from 'react'

function IGThumb({ index }: { index: number }) {
  // Intentamos primero con PNG; si falla, cambiamos a JPG
  const [src, setSrc] = useState<string>(`/images/ig-${index}.png`)
  const [triedJpg, setTriedJpg] = useState(false)

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg">
      <img
        src={src}
        alt={`IG ${index}`}
        loading={index > 3 ? 'lazy' : 'eager'} // primeras 3 priorizadas
        className="h-full w-full object-cover transition-transform hover:scale-105"
        onError={() => {
          // Evita bucles: solo intenta cambiar una vez a .jpg
          if (!triedJpg && src.endsWith('.png')) {
            setTriedJpg(true)
            setSrc(`/images/ig-${index}.jpg`)
          }
        }}
      />
    </div>
  )
}

export default function IGGrid() {
  return (
    <section id="galeria" className="mx-auto max-w-6xl px-4 py-12">
      <h2 className="mb-6 text-2xl font-semibold">Galería</h2>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <IGThumb key={i} index={i + 1} />
        ))}
      </div>
    </section>
  )
}
