export const CARD_UID_LENGTH = 10

export type CardValidationIssue = {
  status: 'VALIDATION_ERROR'
  reason: string
}

export function normalizeCardUID(value: string | null | undefined): string {
  return (value ?? '').toString().trim()
}

export function canonicalizeCardUID(uid: string): string {
  if (!uid) return ''

  const digitsOnly = uid.replace(/\D+/g, '')
  if (!digitsOnly) {
    return ''
  }

  const withoutLeadingZeros = digitsOnly.replace(/^0+/, '')
  return withoutLeadingZeros || '0'
}

export function validateCardUIDFormat(uid: string): CardValidationIssue | null {
  if (!uid) {
    return { status: 'VALIDATION_ERROR', reason: 'empty_value' }
  }

  if (uid.length !== CARD_UID_LENGTH) {
    return { status: 'VALIDATION_ERROR', reason: `length_mismatch:${uid.length}` }
  }

  if (!/^\d+$/.test(uid)) {
    return { status: 'VALIDATION_ERROR', reason: 'invalid_characters' }
  }

  return null
}
