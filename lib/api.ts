import type { RequestInit } from 'next/dist/server/web/spec-extension/request'

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

function authHeaders(admin = false) {
  const h: Record<string,string> = { 'Content-Type': 'application/json' }
  const token = admin ? process.env.API_ADMIN_TOKEN : process.env.API_PUBLIC_TOKEN
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function http<T>(path: string, init: RequestInit = {}, admin = false): Promise<T> {
  const res = await fetch(`${BASE}${path}`,
    { ...init, headers: { ...authHeaders(admin), ...(init.headers as any) }, cache: 'no-store' })
  if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`)
  return res.json() as Promise<T>
}

export const api = {
  auth: {
    requestOtp: (payload: { email?: string; phone?: string }) => http<{ message: string }>(`/auth/otp/request`, { method: 'POST', body: JSON.stringify(payload) }),
    verifyOtp: (payload: { email?: string; phone?: string; code: string }) => http<{ token: string; user: any }>(`/auth/otp/verify`, { method: 'POST', body: JSON.stringify(payload) }),
    me: (token: string) => http<any>(`/auth/me`, { headers: { Authorization: `Bearer ${token}` } } as any),
  },
  athletes: {
    list: (q = '') => http<Array<{id:string; full_name:string; email:string; phone:string}>>(`/athletes?search=${encodeURIComponent(q)}`, {}, true),
    create: (dto: any) => http(`/athletes`, { method: 'POST', body: JSON.stringify(dto) }, true),
    update: (id: string, dto: any) => http(`/athletes/${id}`, { method: 'PUT', body: JSON.stringify(dto) }, true),
    remove: (id: string) => http(`/athletes/${id}`, { method: 'DELETE' }, true),
  },
  routines: {
    listByUser: (userId: string) => http<Array<{ id:string; name:string; url:string; created_at:string }>>(`/routines/user/${userId}`),
    uploadSignedUrl: (fileName: string, userId: string) => http<{ uploadUrl:string; publicUrl:string }>(`/routines/upload-url`, { method: 'POST', body: JSON.stringify({ fileName, userId }) }, true),
  },
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL
async function http<T>(path: string, init: RequestInit = {}, admin = false): Promise<T> {
  if (!BASE) throw new Error('Falta NEXT_PUBLIC_API_BASE_URL en .env.local (ej: http://localhost:4001)')
  const res = await fetch(`${BASE}${path}`, { ...init, headers: { /* ... */ }, cache: 'no-store' })
  if (!res.ok) throw new Error(`[${res.status}] ${await res.text()}`)
  return res.json() as Promise<T>
}
