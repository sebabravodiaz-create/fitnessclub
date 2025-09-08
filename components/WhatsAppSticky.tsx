'use client'
import Link from 'next/link'
import { useMemo } from 'react'

export default function WhatsAppSticky() {
  // si quieres prellenar un mensaje, puedes agregar ?text=... a la URL
  const waHref = useMemo(() => 'https://wa.me/+56992433160', [])
  return (
    <Link
      href={waHref}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="WhatsApp"
      className="
        fixed bottom-5 right-5 z-[60]
        rounded-full shadow-lg
        bg-green-500 text-white
        w-14 h-14 grid place-items-center
        hover:scale-105 transition-transform
      "
      title="Escríbenos por WhatsApp"
    >
      {/* ícono simple (SVG) para no depender de librerías */}
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" width="26" height="26" fill="currentColor" aria-hidden="true">
        <path d="M380.9 97.1C339 55.2 283.2 32 224.5 32c-116.8 0-211.7 94.9-211.7 211.7 0 37.3 9.7 73.7 28.1 105.7L0 480l133.7-39c30.5 16.7 64.9 25.5 99.8 25.5h.1c116.8 0 211.7-94.9 211.7-211.7 0-58.7-23.2-114.5-64.4-157.7zM224.5 438.6c-30.5 0-60.3-8.2-86.2-23.7l-6.2-3.7-79.4 23.2 23.7-77.2-4-6.5c-17.6-28.6-26.9-61.5-26.9-95.3 0-99.1 80.6-179.7 179.7-179.7 48 0 93.1 18.7 127 52.7 33.9 33.9 52.7 79 52.7 127 0 99.1-80.6 179.7-180.4 179.7zm101.6-134c-5.6-2.8-33.1-16.3-38.2-18.1-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18.1-17.6 21.8-3.2 3.7-6.5 4.2-12.1 1.4-5.6-2.8-23.7-8.8-45.1-28.2-16.7-14.9-28.2-33.1-31.4-38.7-3.2-5.6-.3-8.6 2.4-11.4 2.5-2.5 5.6-6.5 8.4-9.7 2.8-3.2 3.7-5.6 5.6-9.3 1.9-3.7.9-7-0.5-9.8-1.4-2.8-12.5-30.2-17.1-41.4-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-7-.2-10.8-.2s-9.8 1.4-14.9 7c-5.1 5.6-19.6 19.1-19.6 46.7 0 27.6 20.1 54.3 22.9 58 2.8 3.7 39.5 60.2 95.7 84.4 13.4 5.8 23.8 9.3 31.9 11.9 13.4 4.3 25.6 3.7 35.2 2.3 10.7-1.6 33.1-13.5 37.7-26.6 4.7-13.1 4.7-24.3 3.3-26.6-1.4-2.3-5.1-3.7-10.7-6.5z"/>
      </svg>
    </Link>
  )
}
