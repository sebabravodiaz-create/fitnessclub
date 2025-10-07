// app/api/cron/memberships/status/route.ts
import { NextRequest } from 'next/server'
import { refreshMembershipStatuses } from '@/lib/memberships/status'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type HandlerResult = Response | Promise<Response>

function extractToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization')
  if (auth) {
    const [scheme, value] = auth.split(' ')
    if (scheme?.toLowerCase() === 'bearer' && value) {
      return value.trim()
    }
  }

  const headerSecret = req.headers.get('x-cron-secret')
  if (headerSecret) {
    return headerSecret.trim()
  }

  const url = new URL(req.url)
  const queryToken = url.searchParams.get('token') ?? url.searchParams.get('secret')
  if (queryToken) {
    return queryToken.trim()
  }

  return null
}

async function handler(req: NextRequest): Promise<Response> {
  const expected = process.env.MEMBERSHIP_STATUS_CRON_SECRET ?? process.env.CRON_SECRET ?? ''
  if (!expected) {
    return Response.json(
      { ok: false, error: 'Cron secret not configured.' },
      { status: 500 },
    )
  }

  const provided = extractToken(req)
  if (!provided || provided !== expected) {
    return Response.json(
      { ok: false, error: 'Unauthorized' },
      { status: 401 },
    )
  }

  try {
    const result = await refreshMembershipStatuses()
    return Response.json({ ok: true, result })
  } catch (err: any) {
    const message = err?.message ?? 'Unexpected error'
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

export function GET(req: NextRequest): HandlerResult {
  return handler(req)
}

export function POST(req: NextRequest): HandlerResult {
  return handler(req)
}
