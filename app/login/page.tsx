'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-gray-950 text-white">
      <div className="mx-auto flex h-full min-h-screen w-full max-w-6xl flex-col overflow-hidden rounded-none bg-gray-950 shadow-2xl ring-1 ring-gray-900/40 md:my-10 md:rounded-3xl md:flex-row">
        <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-950 lg:flex">
          <Image
            src="/images/hero.png"
            alt="Entrenamiento en el Fitness Club Grulla Blanca"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="relative z-10 flex max-w-md flex-col items-start gap-4 px-10 py-14 text-left">
            <p className="text-sm uppercase tracking-[0.3em] text-gray-300">Fitness Club</p>
            <h1 className="text-4xl font-semibold leading-tight">
              Vuelve a tus rutinas, entrena y controla el progreso de tus atletas.
            </h1>
            <p className="text-gray-300">
              Ingresa con tus credenciales de administrador para gestionar rutinas, atletas y contenidos en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center bg-white px-6 py-10 text-gray-900 sm:px-10">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500">Administración</p>
                <h2 className="mt-2 text-3xl font-semibold text-gray-900">Ingreso seguro</h2>
              </div>
              <Link
                href="/"
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-900"
              >
                ← Volver al home
              </Link>
            </div>

            <p className="mb-8 text-sm text-gray-500">
              Usa el correo y contraseña asignados por el equipo de Fitness Club Grulla Blanca para acceder al panel.
            </p>

            <Suspense fallback={<p className="rounded-lg bg-gray-100 p-4 text-sm text-gray-600">Preparando el formulario…</p>}>
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const sp = useSearchParams()

  async function logLoginAttempt(params: { success: boolean; email: string; userId?: string | null; failureReason?: string | null }) {
    try {
      const payload = {
        ...params,
        email: params.email.trim().toLowerCase(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      }
      await fetch('/api/logs/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    } catch (err) {
      console.error('No se pudo registrar el intento de login', err)
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const normalizedEmail = email.trim()
      const { data, error } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password })
      if (error) {
        await logLoginAttempt({ email: normalizedEmail, success: false, failureReason: error.message })
        setError(error.message)
        return
      }
      if (!data?.user) {
        await logLoginAttempt({ email: normalizedEmail, success: false, failureReason: 'No se devolvió un usuario en la sesión.' })
        setError('No se pudo iniciar sesión, revisa tus credenciales.')
        return
      }

      await logLoginAttempt({ email: normalizedEmail, success: true, userId: data.user.id })

      document.cookie = `admin_entry=1; Max-Age=3600; Path=/admin; SameSite=Lax`

      const next = sp.get('next')
      if (next && next.startsWith('/admin') && !next.includes('signout')) {
        window.location.assign(next)
        return
      }

      router.replace('/admin')
    } catch (err: any) {
      const message = err?.message ?? 'Error inesperado al iniciar sesión'
      await logLoginAttempt({ email, success: false, failureReason: message })
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <label className="grid gap-2 text-sm font-medium text-gray-700">
        Correo electrónico
        <input
          type="email"
          placeholder="ejemplo@mail.com"
          autoComplete="email"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-base text-gray-900 shadow-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <label className="grid gap-2 text-sm font-medium text-gray-700">
        Contraseña
        <input
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-base text-gray-900 shadow-sm outline-none transition focus:border-black focus:ring-2 focus:ring-black/10"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </label>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="inline-flex items-center justify-center rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/60 disabled:cursor-not-allowed disabled:bg-gray-800"
      >
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  )
}
