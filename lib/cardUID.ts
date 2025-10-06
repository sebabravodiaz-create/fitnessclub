export function normalizeCardUID(uid: string): string {
  return uid.replace(/^0+/, '').trim().toUpperCase()
}
