import { NextRequest } from 'next/server'
import { validateCardAccess } from '@/lib/access/validateCardAccess'
import { logCardEvent } from '@/lib/logging/cardLogger'
import {
  CARD_UID_LENGTH,
  canonicalizeCardUID,
  normalizeCardUID,
  validateCardUIDFormat,
} from '@/lib/kiosk/cardValidation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({} as any))
  const rawUID = (body?.cardUID ?? '').toString()
  const normalizedUID = normalizeCardUID(rawUID)
  const cardForLog = normalizedUID || rawUID

  await logCardEvent(cardForLog, 'READ', normalizedUID ? 'OK' : 'VALIDATION_ERROR', normalizedUID ? 'input_received' : 'missing_card_uid')

  if (!normalizedUID) {
    await logCardEvent(cardForLog, 'VALIDATE', 'VALIDATION_ERROR', 'empty_value')
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

    const detail = formatIssue.reason
    await logCardEvent(normalizedUID, 'VALIDATE', 'VALIDATION_ERROR', detail)

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

  try {
    const canonicalUID = canonicalizeCardUID(normalizedUID)
    const response = await validateCardAccess(canonicalUID, rawUID, { normalizedUID })

    const validationStatus = response.validation?.status
    const validationDetail = response.validation?.reason ?? response.result
    const statusForLog = validationStatus === 'UNRECOGNIZED' || response.result === 'unknown_card' ? 'UNRECOGNIZED' : 'OK'

    await logCardEvent(response.uid, 'VALIDATE', statusForLog, validationDetail ?? response.result)

    return Response.json(response)
  } catch (err: any) {
    const message = err?.message ?? 'Unexpected error'
    await logCardEvent(normalizedUID, 'VALIDATE', 'ERROR', message)
    return Response.json({ ok: false, error: message, result: 'error', uid: normalizedUID, raw_uid: rawUID }, { status: 500 })
  }
}
