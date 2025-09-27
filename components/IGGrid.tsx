'use client'

import { useEffect, useMemo, useState } from 'react'

interface IGGridProps {
  images?: string[]
  isLoading?: boolean
}

function IGThumb({ source, index }: { source: string; index: number }) {
  const [currentSrc, setCurrentSrc] = useState(source)
  const isLocalPng = source.startsWith('/') && source.endsWith('.png')
  const jpgFallback = isLocalPng ? source.replace(/\.png$/i, '.jpg') : null

  useEffect(() => {
    setCurrentSrc(source)
  }, [source])

  return (
    <div className="relative aspect-square overflow-hidden rounded-lg">
      <img
        src={currentSrc}
        alt={`IG ${index + 1}`}
        loading={index > 3 ? 'lazy' : 'eager'}
        className="h-full w-full object-cover transition-transform hover:scale-105"
        onError={() => {
          if (jpgFallback && currentSrc !== jpgFallback) {
            setCurrentSrc(jpgFallback)
          }
        }}
      />
    </div>
  )
}

export default function IGGrid({ images = [], isLoading = false }: IGGridProps) {
  const placeholders = useMemo(
    () => Array.from({ length: 9 }, (_, index) => `/images/ig-${index + 1}.png`),
    []
  )

  const sources = useMemo(() => {
    const sanitized = images.filter(Boolean)
    if (sanitized.length === 0) return placeholders
    if (sanitized.length >= 9) return sanitized.slice(0, 9)
    return [...sanitized, ...placeholders].slice(0, 9)
  }, [images, placeholders])

  return (
    <section id="galeria" className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Galería</h2>
        {isLoading && (
          <span className="text-xs text-gray-500">Actualizando imágenes…</span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {sources.map((src, index) => (
          <IGThumb key={`${index}-${src}`} source={src} index={index} />
        ))}
      </div>
    </section>
  )
}
