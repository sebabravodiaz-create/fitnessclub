import { NextRequest } from 'next/server'

import { loadAndApplyAppSettings, updateAppSettings } from '@/lib/appSettings.server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const settings = await loadAndApplyAppSettings()
    return Response.json({ ok: true, settings })
  } catch (error: any) {
    const message = error?.message ?? 'No se pudieron obtener las configuraciones.'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const raw = body?.timezoneOffsetMinutes
    let timezoneOffsetMinutes: number | null
    if (raw === null || raw === undefined) {
      timezoneOffsetMinutes = null
    } else if (typeof raw === 'number' && Number.isFinite(raw)) {
      timezoneOffsetMinutes = Math.trunc(raw)
    } else {
      throw new Error('timezoneOffsetMinutes debe ser un número o null')
    }
    const settings = await updateAppSettings({ timezoneOffsetMinutes })
    return Response.json({ ok: true, settings })
  } catch (error: any) {
    const message = error?.message ?? 'No se pudieron actualizar las configuraciones.'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
