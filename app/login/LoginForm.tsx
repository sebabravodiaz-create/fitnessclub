'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getSupabaseBrowserClient } from '@/lib/supabaseClient'

export default function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const sp = useSearchParams()

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); return }
      if (!data?.user) { setError('No se pudo iniciar sesión, revisa tus credenciales.'); return }

      document.cookie = `admin_entry=1; Max-Age=3600; Path=/admin; SameSite=Lax`

      const next = sp.get('next')
      if (next && next.startsWith('/admin') && !next.includes('signout')) {
        window.location.assign(next)
        return
      }

      router.replace('/admin')
    } catch (err: any) {
      setError(err?.message ?? 'Error inesperado al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-md bg-white p-6 rounded-xl shadow relative">
      <div className="flex mb-4">
        <button
          onClick={() => router.push('/')}
          className="px-3 py-1 rounded border border-gray-300 hover:bg-gray-100 text-sm"
        >
          ← Volver al Home
        </button>
      </div>

      <h1 className="text-2xl font-semibold mb-4 text-center">Ingreso</h1>
      <form onSubmit={onSubmit} className="grid gap-3">
        <input
          type="email"
          placeholder="Correo"
          className="border rounded px-3 py-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Contraseña"
          className="border rounded px-3 py-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-black text-white">
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}

