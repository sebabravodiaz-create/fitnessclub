'use client'
import Image from 'next/image'
import { useState } from 'react'
import AccessButtons from '@/components/AccessButtons'
import IGGrid from '@/components/IGGrid'

function HeroImage() {
  const [src, setSrc] = useState('/images/hero.png')
  return (
    <Image
      src={src}
      alt="Entrenamiento"
      fill
      className="object-cover"
      priority
      onError={() => {
        if (src.endsWith('.png')) setSrc('/images/hero.jpg')
      }}
    />
  )
}

export default function HomePage() {
  return (
    <>
      <section className="relative h-[25vh] grid place-items-center">
        <HeroImage />
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

      <IGGrid />

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
    </>
  )
}

