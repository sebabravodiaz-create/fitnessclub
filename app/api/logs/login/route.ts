import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type Body = {
  email?: string
  success?: boolean
  userId?: string | null
  failureReason?: string | null
  userAgent?: string | null
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('Faltan variables de entorno de Supabase para registrar logins.')
  }
  return createClient(url, key, { auth: { persistSession: false } })
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as Body
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : null
    const success = typeof body.success === 'boolean' ? body.success : null
    const userId = body.userId && typeof body.userId === 'string' ? body.userId : null
    const failureReason = typeof body.failureReason === 'string' ? body.failureReason : null
    const uaFromBody = typeof body.userAgent === 'string' ? body.userAgent : null

    if (success === null) {
      return NextResponse.json({ ok: false, error: 'Parámetro "success" es requerido.' }, { status: 400 })
    }

    const supabase = getServiceClient()
    const forwardedFor = req.headers.get('x-forwarded-for') ?? undefined
    const ip = forwardedFor ? forwardedFor.split(',')[0]?.trim() ?? null : null
    const userAgent = uaFromBody ?? req.headers.get('user-agent') ?? null

    const { error } = await supabase.from('login_logs').insert({
      email,
      success,
      user_id: userId,
      failure_reason: failureReason,
      ip_address: ip,
      user_agent: userAgent,
    })

    if (error) throw error

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[login log] error', err)
    const message = err?.message ?? 'No se pudo registrar el login'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
