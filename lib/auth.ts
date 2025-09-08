// lib/auth.ts
import { supabase } from '@/lib/supabaseClient'
import { api } from '@/lib/api'

const MODE = (process.env.API_AUTH_MODE || 'supabase') as 'supabase' | 'mid'

export async function loginAdmin(email: string, password: string) {
  if (MODE === 'supabase') {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return { ok: true }
  }
  // Modo MID/BACK
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error('Credenciales inválidas')
  const data = await res.json()
  localStorage.setItem('admin_token', data.token)
  return { ok: true }
}

export async function requestOtp(payload: { email?: string; phone?: string }) {
  if (MODE === 'supabase') {
    if (payload.email) {
      const { error } = await supabase.auth.signInWithOtp({
        email: payload.email,
        options: { emailRedirectTo: window.location.origin + '/rutinas' },
      })
      if (error) throw error
      return { message: 'Enlace enviado a tu correo' }
    }
    if (payload.phone) {
      const { error } = await supabase.auth.signInWithOtp({ phone: payload.phone })
      if (error) throw error
      return { message: 'Código enviado por SMS' }
    }
  }
  // Modo MID/BACK
  return api.auth.requestOtp(payload)
}

export async function verifyOtp(payload: { email?: string; phone?: string; code?: string }) {
  if (MODE === 'supabase') {
    const { data: { user } } = await supabase.auth.getUser()
    return { token: 'supabase', user }
  }
  // Modo MID/BACK
  const { token, user } = await api.auth.verifyOtp({
    email: payload.email,
    phone: payload.phone,
    code: payload.code!,
  })
  localStorage.setItem('user_token', token)
  return { token, user }
}
