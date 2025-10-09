// app/api/access/validate/route.ts
import { NextRequest } from 'next/server'
import { validateCardAccess } from '@/lib/access/validateCardAccess'
import {
  CARD_UID_LENGTH,
  canonicalizeCardUID,
  normalizeCardUID,
  validateCardUIDFormat,
} from '@/lib/kiosk/cardValidation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({} as any))

    const rawUID = (body?.cardUID ?? '').toString()
    const normalizedUID = normalizeCardUID(rawUID)

    if (!normalizedUID) {
      return Response.json(
        {
          ok: false,
          error: 'cardUID requerido',
          result: 'validation_error',
          uid: normalizedUID,
          raw_uid: rawUID,
          validation: { status: 'VALIDATION_ERROR', reason: 'empty_value', expected_length: CARD_UID_LENGTH },
        },
        { status: 400 },
      )
    }

    const formatIssue = validateCardUIDFormat(normalizedUID)
    if (formatIssue) {
      const message =
        formatIssue.reason === 'invalid_characters'
          ? 'El número de tarjeta debe contener solo dígitos.'
          : `El número de tarjeta debe tener ${CARD_UID_LENGTH} dígitos.`

      return Response.json(
        {
          ok: false,
          error: message,
          result: 'validation_error',
          uid: normalizedUID,
          raw_uid: rawUID,
          validation: { ...formatIssue, expected_length: CARD_UID_LENGTH },
        },
        { status: 422 },
      )
    }

    const canonicalUID = canonicalizeCardUID(normalizedUID)
    const response = await validateCardAccess(canonicalUID, rawUID, { normalizedUID })
    return Response.json(response)
  } catch (err: any) {
    console.error('[access.validate] error:', err)
    return Response.json({ ok: false, error: err?.message ?? 'Unexpected error' }, { status: 500 })
  }
}
